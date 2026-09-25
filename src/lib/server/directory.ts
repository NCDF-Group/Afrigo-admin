import 'server-only'
import { resolveCountry } from '@/lib/geo/countries'
import type { Staff } from './auth'
import { store } from './store'

export type Person = { id: string; name: string; email: string; role: string | null; country: string | null; platform: string }

let cache: { at: number; people: Map<string, Person> } | null = null

export async function directory() {
  if (cache && Date.now() - cache.at < 20_000) return cache.people
  const [users, companies] = await Promise.all([store().list('users', { limit: 20_000 }), store().list('companies', { limit: 20_000 })])
  const companyCountry = new Map(companies.map(company => [company.id, company.country]))
  const people = new Map<string, Person>(
    users.map(user => [
      user.id,
      {
        id: user.id,
        name: user.displayName || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        role: user.role ?? null,
        country: resolveCountry(user.country) ?? resolveCountry(companyCountry.get(user.companyId)),
        platform: user.platform || 'web'
      }
    ])
  )
  cache = { at: Date.now(), people }
  return people
}

export const forgetDirectory = () => {
  cache = null
}

export function person(people: Map<string, Person>, id: unknown) {
  const found = typeof id === 'string' ? people.get(id) : undefined
  return found ? { id: found.id, name: found.name, country: found.country } : null
}

export async function audit(staff: Staff, action: string, target: string, detail: Record<string, unknown> = {}) {
  await store().add('adminAudit', { actorId: staff.uid, actorEmail: staff.email, actorRole: staff.role, action, target, detail, createdAt: new Date() })
}
