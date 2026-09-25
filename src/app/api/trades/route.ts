import { toUsd } from '@/lib/fx'
import { requireStaff } from '@/lib/server/auth'
import { audit, directory, person } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, safeId, text } from '@/lib/server/http'
import { store, type Write } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => {
  await requireStaff(request, 'cases:read')
  const [people, contracts, shipments] = await Promise.all([directory(), store().list('contracts', { limit: 5000 }), store().list('shipments', { limit: 5000 })])
  const shipmentByContract = new Map(shipments.map(shipment => [shipment.contractId, shipment]))
  return {
    items: contracts
      .map(contract => {
        const shipment = shipmentByContract.get(contract.id)
        return {
          id: contract.id,
          product: contract.productTitle || 'Trade',
          quantity: contract.quantity ?? null,
          amount: Number(contract.amount || 0),
          currency: contract.currency || 'USD',
          usd: toUsd(contract.amount, contract.currency),
          status: contract.status || 'pending',
          paymentStatus: contract.paymentStatus || 'not_started',
          payoutStatus: contract.payoutStatus || 'pending',
          refundStatus: contract.refundStatus ?? null,
          flagged: Boolean(contract.flagged),
          buyer: person(people, contract.buyerId),
          seller: person(people, contract.supplierId),
          exporter: person(people, contract.exporterId),
          shipment: shipment ? { id: shipment.id, status: shipment.status, progress: shipment.progress ?? 0, carrier: shipment.carrier ?? null } : null,
          disputeReason: contract.disputeReason ?? null,
          createdAt: contract.createdAt ?? null,
          updatedAt: contract.updatedAt ?? null
        }
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }
})

export const POST = handle(async request => {
  const staff = await requireStaff(request, 'disputes:decide')
  rateLimit(`trades:${staff.uid}`, 30)
  const input = await body(request)
  const id = safeId(input.id)
  const reason = text(input.reason, 1000)
  const contract = await store().get('contracts', id)
  if (!contract) fail(404, 'Trade not found')
  const now = new Date()
  const writes: Write[] = []

  if (input.action === 'cancel') {
    if (!reason) fail(400, 'A reason is required to cancel a trade.')
    if (['completed', 'cancelled', 'refunded'].includes(contract!.status)) fail(409, 'This trade can no longer be cancelled.')
    const refund = contract!.paymentStatus === 'paid' ? { refundStatus: 'requested', refundReason: `Cancelled by Afrigo operations: ${reason}` } : {}
    writes.push({ type: 'update', collection: 'contracts', id, data: { status: 'cancelled', cancelledBy: staff.uid, cancellationReason: reason, ...refund, updatedAt: now } })
  } else if (input.action === 'flag' || input.action === 'unflag') {
    writes.push({ type: 'update', collection: 'contracts', id, data: { flagged: input.action === 'flag', flagReason: reason, flaggedBy: staff.uid, updatedAt: now } })
  } else if (input.action === 'dispute') {
    if (!reason) fail(400, 'Describe the issue to open a dispute.')
    if (['cancelled', 'completed', 'refunded', 'disputed'].includes(contract!.status)) fail(409, 'A dispute cannot be opened for this trade.')
    const paid = contract!.paymentStatus === 'paid'
    writes.push({ type: 'update', collection: 'contracts', id, data: { status: 'disputed', disputeStatus: 'open', disputedBy: staff.uid, disputeReason: reason, payoutStatus: paid ? 'held' : contract!.payoutStatus, heldAmount: paid ? Number(contract!.amount || 0) : 0, updatedAt: now } })
    writes.push({ type: 'add', collection: 'supportCases', data: { contractId: id, buyerId: contract!.buyerId, supplierId: contract!.supplierId, openedBy: staff.uid, category: 'contract_dispute', summary: reason, status: 'open', heldAmount: paid ? Number(contract!.amount || 0) : 0, createdAt: now, updatedAt: now } })
  } else {
    fail(400, 'Unsupported trade action')
  }

  await store().commit(writes)
  await audit(staff, `trade.${input.action}`, id, { reason })
  return { done: input.action }
})
