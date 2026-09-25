import { resolveCountry } from '@/lib/geo/countries'
import { isMemberRole, isPlatform, type Platform } from '@/lib/roles'
import { requireStaff } from '@/lib/server/auth'
import { audit } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, text } from '@/lib/server/http'
import { pushToTokens } from '@/lib/server/services'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

type Audience = { roles: string[]; countries: string[]; platforms: Platform[] }

function audienceOf(input: any): Audience {
  const list = (value: unknown) => (Array.isArray(value) ? value.map(String) : [])
  return {
    roles: list(input?.roles).filter(isMemberRole),
    countries: list(input?.countries).map(item => item.toLowerCase()).filter(item => resolveCountry(item) === item),
    platforms: list(input?.platforms).filter(isPlatform)
  }
}

async function recipients(audience: Audience) {
  const users = await store().list('users', { limit: 50_000 })
  return users.filter(
    user =>
      user.role &&
      user.status !== 'suspended' &&
      (!audience.roles.length || audience.roles.includes(user.role)) &&
      (!audience.countries.length || audience.countries.includes(resolveCountry(user.country) ?? '')) &&
      (!audience.platforms.length || audience.platforms.includes(isPlatform(user.platform) ? user.platform : 'web'))
  )
}

export const GET = handle(async request => {
  await requireStaff(request, 'notifications:send')
  const history = await store().list('broadcasts', { orderBy: ['createdAt', 'desc'], limit: 100 })
  return { items: history }
})

export const POST = handle(async request => {
  const staff = await requireStaff(request, 'notifications:send')
  const input = await body(request)
  const audience = audienceOf(input.audience)
  const matched = await recipients(audience)
  const tokens = [...new Set(matched.flatMap(user => (Array.isArray(user.notificationTokens) ? user.notificationTokens : [])))].filter(Boolean) as string[]

  if (input.action === 'estimate') return { users: matched.length, devices: tokens.length }

  rateLimit(`broadcast:${staff.uid}`, 5, 10 * 60_000)
  const title = text(input.title, 80)
  const message = text(input.body, 240)
  const link = text(input.link, 300)
  if (!title || !message) fail(400, 'A title and message are required.')
  if (link && !/^(https:\/\/|afrigo:\/\/)/.test(link)) fail(400, 'Links must start with https:// or afrigo://')
  const result = await pushToTokens(tokens, { title, body: message, link: link || undefined })
  await store().add('broadcasts', { title, body: message, link: link || null, audience, recipients: matched.length, devices: tokens.length, delivered: result.delivered, failed: result.failed, sentBy: staff.email, createdAt: new Date() })
  await audit(staff, 'notification.broadcast', title, { audience, delivered: result.delivered })
  return result
})
