import { requireStaff } from '@/lib/server/auth'
import { audit, directory, person } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, safeId, text } from '@/lib/server/http'
import { store, type Doc } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

const KINDS = { lots: 'ownerId', rfqs: 'buyerId', bids: 'supplierId' } as const
type Kind = keyof typeof KINDS

const ACTIONS: Record<Kind, Record<string, Record<string, unknown>>> = {
  lots: { archive: { status: 'archived' }, restore: { status: 'active' }, public: { visibility: 'public' }, private: { visibility: 'private' } },
  rfqs: { close: { status: 'Closed' }, reopen: { status: 'Open' }, public: { visibility: 'public' }, private: { visibility: 'private' } },
  bids: { decline: { status: 'Declined' } }
}

const kindOf = (value: unknown): Kind => (typeof value === 'string' && value in KINDS ? (value as Kind) : fail(400, 'Unknown marketplace collection'))

export const GET = handle(async request => {
  await requireStaff(request, 'marketplace:moderate')
  const kind = kindOf(new URL(request.url).searchParams.get('kind') || 'lots')
  const [people, docs] = await Promise.all([directory(), store().list(kind, { limit: 3000 })])
  return {
    items: docs
      .map(({ description, terms, ...item }): Doc => ({ ...item, summary: text(description ?? terms, 240), owner: person(people, item[KINDS[kind]]) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }
})

export const POST = handle(async request => {
  const staff = await requireStaff(request, 'marketplace:moderate')
  rateLimit(`market:${staff.uid}`, 60)
  const input = await body(request)
  const kind = kindOf(input.kind)
  const id = safeId(input.id)
  const change = ACTIONS[kind][text(input.action, 20)]
  if (!change) fail(400, 'Unsupported moderation action')
  if (!(await store().get(kind, id))) fail(404, 'Record not found')
  const reason = text(input.reason, 500)
  await store().update(kind, id, { ...change, moderatedBy: staff.uid, moderationReason: reason, updatedAt: new Date() })
  await audit(staff, `marketplace.${kind}.${input.action}`, id, { reason })
  return { change }
})
