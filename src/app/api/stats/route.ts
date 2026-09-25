import { requireStaff } from '@/lib/server/auth'
import { handle } from '@/lib/server/http'
import { live } from '@/lib/server/live'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => {
  await requireStaff(request, 'analytics:read')
  return { snapshot: await live().snapshot() }
})
