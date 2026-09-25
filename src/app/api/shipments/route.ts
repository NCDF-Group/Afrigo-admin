import { resolveCountry } from '@/lib/geo/countries'
import { requireStaff } from '@/lib/server/auth'
import { audit, directory, person } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, safeId, text } from '@/lib/server/http'
import { store, type Write } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

const MILESTONES: Record<string, number> = { Assigned: 5, 'Picked Up': 20, 'In Transit': 45, 'Customs Clearance': 70, Cleared: 85, Delivered: 100 }

export const GET = handle(async request => {
  await requireStaff(request, 'cases:read')
  const [people, shipments] = await Promise.all([directory(), store().list('shipments', { limit: 5000 })])
  return {
    milestones: Object.keys(MILESTONES),
    items: shipments
      .map(shipment => ({
        id: shipment.id,
        contractId: shipment.contractId,
        status: shipment.status || 'Assigned',
        progress: shipment.progress ?? 0,
        carrier: shipment.carrier ?? null,
        trackingNumber: shipment.trackingNumber ?? null,
        origin: resolveCountry(shipment.origin) ?? people.get(shipment.supplierId)?.country ?? null,
        destination: resolveCountry(shipment.destination) ?? people.get(shipment.buyerId)?.country ?? null,
        exporter: person(people, shipment.exporterId),
        buyer: person(people, shipment.buyerId),
        seller: person(people, shipment.supplierId),
        createdAt: shipment.createdAt ?? null,
        updatedAt: shipment.updatedAt ?? null
      }))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  }
})

export const POST = handle(async request => {
  const staff = await requireStaff(request, 'disputes:decide')
  rateLimit(`shipments:${staff.uid}`, 30)
  const input = await body(request)
  const id = safeId(input.id)
  const status = text(input.status, 40)
  const reason = text(input.reason, 1000)
  if (!(status in MILESTONES)) fail(400, 'Choose a valid milestone')
  if (!reason) fail(400, 'A reason is required for a manual milestone override.')
  const shipment = await store().get('shipments', id)
  if (!shipment) fail(404, 'Shipment not found')
  const now = new Date()
  const writes: Write[] = [{ type: 'update', collection: 'shipments', id, data: { status, progress: MILESTONES[status], overrideBy: staff.uid, overrideReason: reason, updatedAt: now } }]
  if (status === 'Delivered' && shipment!.contractId) writes.push({ type: 'update', collection: 'contracts', id: shipment!.contractId, data: { status: 'completed', completedAt: now, updatedAt: now } })
  await store().commit(writes)
  await audit(staff, 'shipment.override', id, { status, reason })
  return { status }
})
