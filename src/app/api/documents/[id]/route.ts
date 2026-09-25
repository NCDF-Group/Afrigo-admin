import { requireStaff } from '@/lib/server/auth'
import { audit } from '@/lib/server/directory'
import { fail, handle, safeId } from '@/lib/server/http'
import { signedDocumentUrl } from '@/lib/server/services'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export const GET = handle<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const staff = await requireStaff(request, 'risk:read')
  const id = safeId((await params).id)
  const document = await store().get('documents', id)
  if (!document?.storagePath) fail(404, 'Document not found')
  const url = await signedDocumentUrl(document!.storagePath)
  if (!url) fail(501, 'Document previews are unavailable in demo mode.')
  await audit(staff, 'document.view', id)
  return { url }
})
