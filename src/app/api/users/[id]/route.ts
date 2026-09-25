import { isMemberRole } from '@/lib/roles'
import { requireStaff } from '@/lib/server/auth'
import { audit, forgetDirectory } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, safeId, text } from '@/lib/server/http'
import { revokeSessions, setAccountDisabled } from '@/lib/server/services'
import { store, type Write } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export const GET = handle<Context>(async (request, { params }) => {
  await requireStaff(request, 'users:read')
  const id = safeId((await params).id)
  const user = await store().get('users', id)
  if (!user) fail(404, 'User not found')
  const [company, documents, bought, sold, activity] = await Promise.all([
    user!.companyId ? store().get('companies', user!.companyId) : null,
    store().list('documents', { where: [['ownerId', '==', id]], limit: 50 }),
    store().list('contracts', { where: [['buyerId', '==', id]], limit: 50 }),
    store().list('contracts', { where: [['supplierId', '==', id]], limit: 50 }),
    store().list('activityLogs', { where: [['actorId', '==', id]], limit: 200 })
  ])
  const { notificationTokens, settlement, ...profile } = user!
  return {
    user: { ...profile, pushEnabled: Array.isArray(notificationTokens) && notificationTokens.length > 0, settlement: settlement ? { accountLast4: settlement.accountLast4, bankCode: settlement.bankCode } : null },
    company,
    documents,
    contracts: [...bought, ...sold].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    activity: activity.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 25)
  }
})

export const POST = handle<Context>(async (request, { params }) => {
  const staff = await requireStaff(request, 'users:manage')
  rateLimit(`users:${staff.uid}`, 40)
  const id = safeId((await params).id)
  const input = await body(request)
  const action = text(input.action, 40)
  const reason = text(input.reason, 1000)
  const user = await store().get('users', id)
  if (!user) fail(404, 'User not found')
  const now = new Date()
  const writes: Write[] = []

  if (action === 'verify' || action === 'reject') {
    const kycStatus = action === 'verify' ? 'verified' : 'rejected'
    writes.push({ type: 'update', collection: 'users', id, data: { kycStatus, verificationStatus: kycStatus, kycReviewedBy: staff.uid, kycReviewReason: reason, updatedAt: now } })
    if (user!.companyId) writes.push({ type: 'update', collection: 'companies', id: user!.companyId, data: { kycStatus, updatedAt: now } })
  } else if (action === 'suspend' || action === 'reactivate') {
    if (action === 'suspend' && !reason) fail(400, 'A reason is required to suspend an account.')
    await setAccountDisabled(id, action === 'suspend')
    writes.push({ type: 'update', collection: 'users', id, data: { status: action === 'suspend' ? 'suspended' : 'active', statusReason: reason, statusChangedBy: staff.uid, updatedAt: now } })
  } else if (action === 'role') {
    if (!isMemberRole(input.role)) fail(400, 'Choose Buyer, Seller or Exporter.')
    writes.push({ type: 'update', collection: 'users', id, data: { role: input.role, updatedAt: now } })
  } else if (action === 'revoke') {
    await revokeSessions(id)
  } else {
    fail(400, 'Unsupported action')
  }

  if (writes.length) await store().commit(writes)
  forgetDirectory()
  await audit(staff, `user.${action}`, id, { reason, role: input.role ?? null })
  return { done: action }
})
