import { requireStaff } from '@/lib/server/auth'
import { audit } from '@/lib/server/directory'
import { body, fail, handle, safeId } from '@/lib/server/http'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

const STATUSES = ['new', 'in_progress', 'resolved', 'spam']

export const GET = handle(async request => {
  await requireStaff(request, 'inbox:manage')
  const items = await store().list('contactSubmissions', { orderBy: ['createdAt', 'desc'], limit: 1000 })
  return { items }
})

export const POST = handle(async request => {
  const staff = await requireStaff(request, 'inbox:manage')
  const input = await body(request)
  const id = safeId(input.id)
  if (!STATUSES.includes(input.status)) fail(400, 'Unknown status')
  if (!(await store().get('contactSubmissions', id))) fail(404, 'Message not found')
  await store().update('contactSubmissions', id, { status: input.status, handledBy: staff.email, updatedAt: new Date() })
  await audit(staff, `inbox.${input.status}`, id)
  return { status: input.status }
})
