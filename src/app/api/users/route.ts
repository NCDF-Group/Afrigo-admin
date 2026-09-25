import { resolveCountry } from '@/lib/geo/countries'
import { requireStaff } from '@/lib/server/auth'
import { handle } from '@/lib/server/http'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

export const GET = handle(async request => {
  await requireStaff(request, 'users:read')
  const [users, companies] = await Promise.all([store().list('users', { limit: 20_000 }), store().list('companies', { limit: 20_000 })])
  const companyById = new Map(companies.map(company => [company.id, company]))
  const items = users
    .filter(user => user.role)
    .map(user => {
      const company = companyById.get(user.companyId)
      return {
        id: user.id,
        name: user.displayName || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        role: user.role,
        country: resolveCountry(user.country) ?? resolveCountry(company?.country),
        company: company?.name ?? null,
        kycStatus: user.kycStatus || company?.kycStatus || 'not_started',
        status: user.status || 'active',
        platform: user.platform || 'web',
        appVersion: user.appVersion ?? null,
        lastActiveAt: user.lastActiveAt ?? null,
        createdAt: user.createdAt ?? null
      }
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  return { items }
})
