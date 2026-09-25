import { STAFF_ROLES, isStaffRole } from '@/lib/roles'
import { requireStaff } from '@/lib/server/auth'
import { audit, forgetDirectory } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, text } from '@/lib/server/http'
import { findAccount, revokeSessions, setClaims } from '@/lib/server/services'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => {
  await requireStaff(request, 'staff:manage')
  const [staff, history] = await Promise.all([
    store().list('users', { where: [['operationalRole', 'in', [...STAFF_ROLES]]], limit: 200 }),
    store().list('staffRoleAudit', { orderBy: ['createdAt', 'desc'], limit: 50 })
  ])
  return {
    staff: staff.map(item => ({ id: item.id, email: item.email, name: item.displayName || item.email, role: item.operationalRole, status: item.staffStatus || 'active', assignedAt: item.staffAssignedAt ?? null })),
    history
  }
})

export const POST = handle(async request => {
  const actor = await requireStaff(request, 'staff:manage')
  rateLimit(`staff:${actor.uid}`, 10)
  const input = await body(request)
  const email = text(input.email, 200).toLowerCase()
  const role = input.role === null ? null : text(input.role, 40)
  if (!email.includes('@') || (role !== null && !isStaffRole(role))) fail(400, 'Enter a valid email and role.')
  const account = await findAccount(email)
  if (!account.emailVerified) fail(409, 'This account must verify its email before receiving staff access.')
  if (account.uid === actor.uid && role !== 'super_admin') fail(409, 'You cannot remove your own super administrator access.')
  const current = await store().get('users', account.uid)
  const claims = { ...account.claims }
  if (role) claims.operationalRole = role
  else delete claims.operationalRole
  await setClaims(account.uid, claims)
  const now = new Date()
  await store().commit([
    { type: 'set', collection: 'users', id: account.uid, data: { email, displayName: account.displayName || current?.displayName || email.split('@')[0], operationalRole: role, staffStatus: role ? 'active' : 'revoked', staffAssignedBy: actor.uid, staffAssignedAt: now, updatedAt: now }, merge: true },
    { type: 'add', collection: 'staffRoleAudit', data: { targetUid: account.uid, targetEmail: email, previousRole: current?.operationalRole ?? null, newRole: role, assignedBy: actor.uid, assignedByEmail: actor.email, createdAt: now } }
  ])
  await revokeSessions(account.uid)
  forgetDirectory()
  await audit(actor, role ? 'staff.assign' : 'staff.revoke', account.uid, { email, role })
  return { message: role ? 'Role assigned. Their sessions were signed out so the new access applies immediately.' : 'Staff access revoked.' }
})
