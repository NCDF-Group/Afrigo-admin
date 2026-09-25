import { toUsd } from '@/lib/fx'
import { requireStaff } from '@/lib/server/auth'
import { audit, directory, person } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, safeId, text } from '@/lib/server/http'
import { paystackRefund } from '@/lib/server/services'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

const OPEN = ['pending_approval', 'partially_approved', 'approved', 'held']

export const GET = handle(async request => {
  await requireStaff(request, 'finance:read')
  const [people, requests, refunds, contracts] = await Promise.all([
    directory(),
    store().list('payoutRequests', { where: [['status', 'in', OPEN]], limit: 1000 }),
    store().list('contracts', { where: [['refundStatus', '==', 'requested']], limit: 1000 }),
    store().list('contracts', { where: [['paymentStatus', '==', 'paid']], limit: 10_000 })
  ])
  const sum = (items: any[]) => items.reduce((total, item) => total + toUsd(item.amount, item.currency), 0)
  return {
    summary: {
      settled: sum(contracts),
      escrow: sum(contracts.filter(item => ['paid', 'shipping'].includes(item.status))),
      held: sum(contracts.filter(item => item.status === 'disputed' || item.payoutStatus === 'held')),
      paidOut: sum(contracts.filter(item => item.payoutStatus === 'success')),
      pendingPayouts: sum(requests),
      pendingRefunds: sum(refunds)
    },
    payouts: requests
      .map(item => ({ id: item.id, contractId: item.contractId, amount: Number(item.amount || 0), currency: item.currency || 'NGN', usd: toUsd(item.amount, item.currency), status: item.status, requiresTwoApprovals: Boolean(item.requiresTwoApprovals), approvals: (item.approvalIds ?? []).length, riskReasons: item.riskReasons ?? [], account: item.settlementSnapshot ? `${item.settlementSnapshot.bankCode ?? ''} •••• ${item.settlementSnapshot.accountLast4 ?? ''}` : null, seller: person(people, item.sellerId), createdAt: item.createdAt ?? null }))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    refunds: refunds
      .map(item => ({ id: item.id, product: item.productTitle || 'Trade', amount: Number(item.amount || 0), currency: item.currency || 'USD', usd: toUsd(item.amount, item.currency), reason: item.refundReason || '', buyer: person(people, item.buyerId), seller: person(people, item.supplierId), createdAt: item.updatedAt ?? item.createdAt ?? null }))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  }
})

export const POST = handle(async request => {
  const input = await body(request)
  const action = text(input.action, 30)
  const now = new Date()

  if (action === 'refund-approve' || action === 'refund-reject') {
    const staff = await requireStaff(request, 'refunds:execute')
    rateLimit(`refunds:${staff.uid}`, 10)
    const id = safeId(input.contractId)
    const reason = text(input.reason, 500)
    const contract = await store().get('contracts', id)
    if (!contract || contract.refundStatus !== 'requested') fail(409, 'There is no pending refund for this trade.')
    if (action === 'refund-reject') {
      if (!reason) fail(400, 'Add a reason for rejecting the refund.')
      await store().update('contracts', id, { refundStatus: 'rejected', refundReviewedBy: staff.uid, refundReviewReason: reason, updatedAt: now })
      await audit(staff, 'refund.reject', id, { reason })
      return { status: 'rejected' }
    }
    const [payment] = await store().list('payments', { where: [['contractId', '==', id], ['status', '==', 'paid']], limit: 1 })
    const result = await paystackRefund({ reference: payment?.providerReference ?? id, amount: Number(contract!.amount || 0), currency: contract!.currency || 'NGN', note: reason || contract!.refundReason || 'Approved marketplace refund' })
    await store().update('contracts', id, { refundStatus: 'processing', refundProviderId: result.id, refundReviewedBy: staff.uid, updatedAt: now })
    await audit(staff, 'refund.approve', id, { reason })
    return { status: 'processing' }
  }

  const staff = await requireStaff(request, 'payouts:execute')
  rateLimit(`payouts:${staff.uid}`, 20)
  const id = safeId(input.requestId)
  const payout = await store().get('payoutRequests', id)
  if (!payout) fail(404, 'Payout request not found')

  if (action === 'approve') {
    if (!['pending_approval', 'partially_approved'].includes(payout!.status)) fail(409, 'This request is not awaiting approval.')
    const approvals = [...new Set([...(payout!.approvalIds ?? []), staff.uid])]
    if (approvals.length === (payout!.approvalIds ?? []).length) fail(409, 'You already approved this payout. A second operator must approve it.')
    const status = approvals.length >= (payout!.requiresTwoApprovals ? 2 : 1) ? 'approved' : 'partially_approved'
    await store().update('payoutRequests', id, { approvalIds: approvals, status, [`approvalAudit.${staff.uid}`]: { email: staff.email, at: now }, updatedAt: now })
    await audit(staff, 'payout.approve', id, { status })
    return { status }
  }

  if (action === 'mark-paid') {
    const reference = text(input.reference, 180)
    if (payout!.status !== 'approved' || !reference) fail(409, 'An approved request and a bank reference are required.')
    await store().commit([
      { type: 'update', collection: 'payoutRequests', id, data: { status: 'paid', externalReference: reference, markedPaidBy: staff.uid, markedPaidAt: now, updatedAt: now } },
      { type: 'update', collection: 'contracts', id: payout!.contractId, data: { payoutStatus: 'success', payoutExternalReference: reference, paidOutAt: now, updatedAt: now } }
    ])
    await audit(staff, 'payout.paid', id, { reference })
    return { status: 'paid' }
  }

  if (action === 'hold' || action === 'release') {
    const reason = text(input.reason, 500)
    if (action === 'hold' && !reason) fail(400, 'Add a reason for holding this payout.')
    if (action === 'release' && payout!.status !== 'held') fail(409, 'This payout is not on hold.')
    const status = action === 'hold' ? 'held' : 'pending_approval'
    await store().update('payoutRequests', id, { status, holdReason: reason, approvalIds: action === 'release' ? [] : payout!.approvalIds ?? [], updatedAt: now })
    await audit(staff, `payout.${action}`, id, { reason })
    return { status }
  }

  return fail(400, 'Unsupported finance action')
})
