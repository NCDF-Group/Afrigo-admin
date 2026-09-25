import { requireStaff } from '@/lib/server/auth'
import { directory, person } from '@/lib/server/directory'
import { handle } from '@/lib/server/http'
import { store } from '@/lib/server/store'
import { resolveCountry } from '@/lib/geo/countries'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => {
  const source = new URL(request.url).searchParams.get('source') === 'admin' ? 'admin' : 'platform'
  if (source === 'admin') {
    await requireStaff(request, 'staff:manage')
    const items = await store().list('adminAudit', { orderBy: ['createdAt', 'desc'], limit: 500 })
    return { items }
  }
  await requireStaff(request, 'analytics:read')
  const [people, logs] = await Promise.all([directory(), store().list('activityLogs', { orderBy: ['createdAt', 'desc'], limit: 1000 })])
  return {
    items: logs.map(log => {
      const actor = person(people, log.actorId)
      return { id: log.id, type: log.type, label: log.label, detail: log.detail ?? null, role: log.role ?? null, platform: log.platform ?? people.get(log.actorId)?.platform ?? 'web', country: resolveCountry(log.country) ?? actor?.country ?? null, actor, createdAt: log.createdAt ?? null }
    })
  }
})
