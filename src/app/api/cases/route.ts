import { toUsd } from '@/lib/fx'
import { requireStaff } from '@/lib/server/auth'
import { audit, directory, person } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, safeId, text } from '@/lib/server/http'
import { store, type Write } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => {
  await requireStaff(request, 'cases:read')
  const [people, cases, disputed] = await Promise.all([
    directory(),
    store().list('supportCases', { where: [['status', '==', 'open']], limit: 1000 }),
    store().list('contracts', { where: [['status', '==', 'disputed']], limit: 1000 })
  ])
  const caseByContract = new Map(cases.filter(item => item.contractId).map(item => [item.contractId, item]))
  return {
    disputes: disputed
      .map(contract => ({
        id: contract.id,
        caseId: caseByContract.get(contract.id)?.id ?? null,
        product: contract.productTitle || 'Trade',
        amount: Number(contract.amount || 0),
        currency: contract.currency || 'USD',
        usd: toUsd(contract.amount, contract.currency),
        paid: contract.paymentStatus === 'paid',
        reason: contract.disputeReason || caseByContract.get(contract.id)?.summary || '',
        openedBy: person(people, contract.disputedBy),
        buyer: person(people, contract.buyerId),
        seller: person(people, contract.supplierId),
        createdAt: caseByContract.get(contract.id)?.createdAt ?? contract.updatedAt ?? null
      }))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    cases: cases
      .filter(item => item.category !== 'contract_dispute')
      .map(item => ({ id: item.id, category: item.category || 'general', summary: item.summary || '', openedBy: person(people, item.openedBy), createdAt: item.createdAt ?? null, updatedAt: item.updatedAt ?? null }))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  }
})

export const POST = handle(async request => {
  const input = await body(request)
  const now = new Date()

  if (input.action === 'resolve-dispute') {
    const staff = await requireStaff(request, 'disputes:decide')
    rateLimit(`disputes:${staff.uid}`, 20)
    const id = safeId(input.contractId)
    const decision = text(input.decision, 10)
    const reason = text(input.reason, 2000)
    const contract = await store().get('contracts', id)
    if (!contract || contract.status !== 'disputed') fail(409, 'This trade is not in dispute.')
    if (!['buyer', 'seller', 'cancel'].includes(decision) || !reason) fail(400, 'Choose a decision and explain it.')
    const paid = contract!.paymentStatus === 'paid'
    const updates: Record<string, unknown> = { disputeStatus: 'resolved', disputeDecision: decision, disputeDecisionReason: reason, disputeDecidedBy: staff.uid, disputeDecidedAt: now, updatedAt: now }
    if (decision === 'buyer') Object.assign(updates, { refundStatus: 'requested', refundReason: reason })
    else if (decision === 'seller') Object.assign(updates, { status: paid ? 'paid' : 'accepted', payoutStatus: paid ? 'pending' : contract!.payoutStatus, heldAmount: 0 })
    else Object.assign(updates, { status: 'cancelled', ...(paid ? { refundStatus: 'requested', refundReason: reason } : {}) })
    const writes: Write[] = [{ type: 'update', collection: 'contracts', id, data: updates }]
    const related = await store().list('supportCases', { where: [['contractId', '==', id]], limit: 5 })
    for (const item of related.filter(entry => entry.status === 'open')) writes.push({ type: 'update', collection: 'supportCases', id: item.id, data: { status: 'resolved', resolution: decision, resolvedBy: staff.uid, resolvedAt: now, updatedAt: now } })
    await store().commit(writes)
    await audit(staff, `dispute.resolve.${decision}`, id, { reason })
    return { decision }
  }

  if (input.action === 'note') {
    const staff = await requireStaff(request, 'cases:communicate')
    const id = safeId(input.caseId)
    const note = text(input.note, 2000)
    if (!note) fail(400, 'Write a note first.')
    if (!(await store().get('supportCases', id))) fail(404, 'Case not found')
    await store().add(`supportCases/${id}/notes`, { body: note, authorId: staff.uid, authorEmail: staff.email, createdAt: now })
    await store().update('supportCases', id, { lastActivityAt: now, updatedAt: now })
    return { added: true }
  }

  if (input.action === 'close') {
    const staff = await requireStaff(request, 'cases:communicate')
    const id = safeId(input.caseId)
    const resolution = text(input.reason, 1000)
    if (!resolution) fail(400, 'Add a resolution summary.')
    if (!(await store().get('supportCases', id))) fail(404, 'Case not found')
    await store().update('supportCases', id, { status: 'resolved', resolution, resolvedBy: staff.uid, resolvedAt: now, updatedAt: now })
    await audit(staff, 'case.close', id, { resolution })
    return { closed: true }
  }

  return fail(400, 'Unsupported case action')
})
