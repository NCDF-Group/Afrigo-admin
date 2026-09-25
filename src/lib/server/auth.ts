import 'server-only'
import { DEMO_MODE } from '@/lib/env'
import { can, isStaffRole, type Capability, type StaffRole } from '@/lib/roles'
import { firebase } from './firebase'
import { fail } from './http'

export type Staff = { uid: string; email: string; name: string; role: StaffRole }

const owners = () =>
  (process.env.SUPER_ADMIN_EMAILS || 'ukwun97@gmail.com')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)

export const DEMO_STAFF: Staff = { uid: 'demo-operator', email: 'operator@afrigo.demo', name: 'Demo operator', role: 'super_admin' }

export async function requireStaff(request: Request, capability?: Capability): Promise<Staff> {
  if (DEMO_MODE) return DEMO_STAFF
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) fail(401, 'Authentication required')
  let decoded
  try {
    decoded = await firebase().auth.verifyIdToken(token!, true)
  } catch {
    return fail(401, 'Your session expired. Sign in again.')
  }
  const email = (decoded.email || '').toLowerCase()
  const role: StaffRole | null = owners().includes(email) ? 'super_admin' : isStaffRole(decoded.operationalRole) ? decoded.operationalRole : null
  if (!role) fail(403, 'This account does not have staff access.')
  if (!decoded.email_verified) fail(403, 'Verify your email address before accessing the console.')
  if (capability && !can(role, capability)) fail(403, 'You do not have permission for this action.')
  return { uid: decoded.uid, email, name: decoded.name || email.split('@')[0], role: role! }
}

