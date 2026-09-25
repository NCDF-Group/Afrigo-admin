import { requireStaff } from '@/lib/server/auth'
import { handle, safeId } from '@/lib/server/http'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export const GET = handle<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  await requireStaff(request, 'cases:read')
  const id = safeId((await params).id)
  const notes = await store().list(`supportCases/${id}/notes`, { limit: 200 })
  return { notes: notes.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)) }
})
