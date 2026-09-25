import { requireStaff } from '@/lib/server/auth'
import { audit, directory, person } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, safeId, text } from '@/lib/server/http'
import { store, type Write } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => {
  await requireStaff(request, 'risk:read')
  const [people, documents, companies, compliance] = await Promise.all([
    directory(),
    store().list('documents', { where: [['status', '==', 'Submitted']], limit: 500 }),
    store().list('companies', { where: [['kycStatus', '==', 'pending']], limit: 500 }),
    store().list('compliance_actions', { where: [['status', '==', 'Pending']], limit: 500 })
  ])
  const byOldest = (a: any, b: any) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
  return {
    documents: documents.sort(byOldest).map(item => ({ id: item.id, type: item.type, name: item.meta?.name ?? 'Document', size: item.meta?.size ?? 0, mimeType: item.meta?.mimeType ?? '', owner: person(people, item.ownerId), createdAt: item.createdAt })),
    companies: companies.sort(byOldest).map(item => ({ id: item.id, name: item.name, country: item.country, owner: person(people, item.ownerId), createdAt: item.createdAt })),
    compliance: compliance.sort(byOldest).map(item => ({ id: item.id, category: item.category, requirement: item.requirement, dueDate: item.dueDate, owner: person(people, item.ownerId), createdAt: item.createdAt }))
  }
})

export const POST = handle(async request => {
  const staff = await requireStaff(request, 'compliance:review')
  rateLimit(`verify:${staff.uid}`, 60)
  const input = await body(request)
  const id = safeId(input.id)
  const approve = input.decision === 'approve'
  const reason = text(input.reason, 1000)
  if (!approve && !reason) fail(400, 'Add a reason so the business knows what to fix.')
  const now = new Date()
  const review = { reviewReason: reason, reviewedBy: staff.uid, reviewedAt: now, updatedAt: now }
  const writes: Write[] = []

  if (input.kind === 'document') {
    if (!(await store().get('documents', id))) fail(404, 'Document not found')
    writes.push({ type: 'update', collection: 'documents', id, data: { status: approve ? 'Approved' : 'Rejected', ...review } })
  } else if (input.kind === 'compliance') {
    if (!(await store().get('compliance_actions', id))) fail(404, 'Compliance item not found')
    writes.push({ type: 'update', collection: 'compliance_actions', id, data: { status: approve ? 'Verified' : 'Rejected', ...review } })
  } else if (input.kind === 'company') {
    const company = await store().get('companies', id)
    if (!company) fail(404, 'Company not found')
    const kycStatus = approve ? 'verified' : 'rejected'
    writes.push({ type: 'update', collection: 'companies', id, data: { kycStatus, ...review } })
    if (company!.ownerId) writes.push({ type: 'update', collection: 'users', id: company!.ownerId, data: { kycStatus, verificationStatus: kycStatus, updatedAt: now } })
  } else {
    fail(400, 'Unknown review item')
  }

  await store().commit(writes)
  await audit(staff, `verification.${input.kind}.${approve ? 'approve' : 'reject'}`, id, { reason })
  return { status: approve ? 'approved' : 'rejected' }
})
