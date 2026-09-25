import { DEMO_MODE } from '@/lib/env'
import { requireStaff } from '@/lib/server/auth'
import { handle } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => ({ staff: await requireStaff(request), demo: DEMO_MODE }))
