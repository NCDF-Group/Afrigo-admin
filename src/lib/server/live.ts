import 'server-only'
import { toUsd } from '@/lib/fx'
import { COUNTRIES, resolveCountry } from '@/lib/geo/countries'
import { isPlatform, PLATFORMS, type Platform } from '@/lib/roles'
import type { CountryStat, LiveEvent, LiveSnapshot } from '@/lib/types'
import { store, type Doc, type Query } from './store'

const DAY = 86_400_000
const ACTIVE_WINDOW = 15 * 60_000
const OPEN_PAYOUTS = ['pending_approval', 'partially_approved', 'approved', 'held']

const SOURCES: Record<string, [string, Query]> = {
  users: ['users', {}],
  companies: ['companies', {}],
  contracts: ['contracts', {}],
  shipments: ['shipments', {}],
  lots: ['lots', { where: [['status', '==', 'active']] }],
  rfqs: ['rfqs', { where: [['status', '==', 'Open']] }],
  activity: ['activityLogs', { orderBy: ['createdAt', 'desc'], limit: 2000 }],
  documents: ['documents', { where: [['status', '==', 'Submitted']] }],
  cases: ['supportCases', { where: [['status', '==', 'open']] }],
  payouts: ['payoutRequests', { where: [['status', 'in', OPEN_PAYOUTS]] }],
  inbox: ['contactSubmissions', { where: [['status', '==', 'new']] }],
  compliance: ['compliance_actions', { where: [['status', '==', 'Pending']] }]
}

type Key = keyof typeof SOURCES
type Data = Record<Key, Doc[]>

const platformOf = (value: unknown): Platform => (isPlatform(value) ? value : 'web')
const startOfDay = (time: number) => {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function emptyCountry(iso: string): CountryStat {
  return {
    iso,
    users: 0,
    buyers: 0,
    sellers: 0,
    exporters: 0,
    companies: 0,
    verified: 0,
    pendingKyc: 0,
    listings: 0,
    openRfqs: 0,
    trades: 0,
    activeTrades: 0,
    completedTrades: 0,
    exportsUsd: 0,
    importsUsd: 0,
    inTransit: 0,
    activeNow: 0,
    signups7d: 0,
    platforms: { web: 0, ios: 0, android: 0 }
  }
}

export function compute(data: Data, now = Date.now()): LiveSnapshot {
  const countries = new Map(COUNTRIES.map(country => [country.iso, emptyCountry(country.iso)]))
  const companyCountry = new Map(data.companies.map(company => [company.id, resolveCountry(company.country)]))
  const userCountry = new Map<string, string | null>()
  const userPlatform = new Map<string, Platform>()
  const active = new Set<string>()
  const platforms = Object.fromEntries(PLATFORMS.map(platform => [platform, { users: 0, activeNow: 0, eventsToday: 0 }])) as LiveSnapshot['platforms']
  const today = startOfDay(now)
  const firstDay = today - 29 * DAY
  const series = Array.from({ length: 30 }, (_, index) => ({ day: firstDay + index * DAY, signups: 0, trades: 0, gmv: 0 }))
  const bucket = (time: number) => (time >= firstDay ? Math.floor((time - firstDay) / DAY) : -1)
  const at = (iso: string | null | undefined) => (iso ? countries.get(iso) : undefined)

  let staff = 0, signupsToday = 0, signupsWeek = 0, signupsPrevWeek = 0
  for (const user of data.users) {
    if (!user.role) {
      staff++
      continue
    }
    const iso = resolveCountry(user.country) ?? companyCountry.get(user.companyId) ?? null
    const platform = platformOf(user.platform)
    userCountry.set(user.id, iso)
    userPlatform.set(user.id, platform)
    platforms[platform].users++
    if (now - (user.lastActiveAt ?? 0) < ACTIVE_WINDOW) active.add(user.id)
    const created = user.createdAt ?? 0
    const index = bucket(created)
    if (index >= 0) series[index].signups++
    if (created >= today) signupsToday++
    if (created >= now - 7 * DAY) signupsWeek++
    else if (created >= now - 14 * DAY) signupsPrevWeek++
    const stat = at(iso)
    if (!stat) continue
    stat.users++
    stat.platforms[platform]++
    if (user.role === 'Buyer') stat.buyers++
    if (user.role === 'Seller') stat.sellers++
    if (user.role === 'Exporter') stat.exporters++
    if (user.kycStatus === 'verified') stat.verified++
    if (user.kycStatus === 'pending') stat.pendingKyc++
    if (created >= now - 7 * DAY) stat.signups7d++
  }

  for (const company of data.companies) {
    const stat = at(companyCountry.get(company.id))
    if (stat) stat.companies++
  }

  const events: LiveEvent[] = []
  const hourly = Array(24).fill(0)
  for (const log of data.activity) {
    const time = log.createdAt ?? 0
    const platform = isPlatform(log.platform) ? log.platform : userPlatform.get(log.actorId) ?? 'web'
    if (now - time < ACTIVE_WINDOW && log.actorId) active.add(log.actorId)
    if (time >= today) platforms[platform].eventsToday++
    if (now - time < DAY) hourly[23 - Math.min(23, Math.floor((now - time) / 3_600_000))]++
    if (events.length < 40) {
      events.push({ id: log.id, type: String(log.type || 'event'), label: String(log.label || 'Activity'), country: resolveCountry(log.country) ?? userCountry.get(log.actorId) ?? null, platform, role: log.role ?? null, actorId: log.actorId ?? null, at: time })
    }
  }

  for (const id of active) {
    const stat = at(userCountry.get(id))
    if (stat) stat.activeNow++
    const platform = userPlatform.get(id)
    if (platform) platforms[platform].activeNow++
  }

  for (const lot of data.lots) {
    const stat = at(resolveCountry(lot.origin) ?? userCountry.get(lot.ownerId))
    if (stat) stat.listings++
  }

  for (const rfq of data.rfqs) {
    const stat = at(resolveCountry(rfq.destination_country) ?? userCountry.get(rfq.buyerId))
    if (stat) stat.openRfqs++
  }

  const tradeStatus: Record<string, number> = {}
  const products = new Map<string, { title: string; trades: number; gmv: number }>()
  let gmv = 0, tradesToday = 0, activeTrades = 0, refunds = 0, disputes = 0
  let tradesWeek = 0, tradesPrevWeek = 0, gmvWeek = 0, gmvPrevWeek = 0
  for (const contract of data.contracts) {
    const status = String(contract.status || 'pending')
    tradeStatus[status] = (tradeStatus[status] ?? 0) + 1
    const paid = contract.paymentStatus === 'paid'
    const value = paid ? toUsd(contract.amount, contract.currency) : 0
    const created = contract.createdAt ?? 0
    const isActive = ['accepted', 'paid', 'shipping', 'disputed'].includes(status)
    gmv += value
    if (isActive) activeTrades++
    if (status === 'disputed') disputes++
    if (contract.refundStatus === 'requested') refunds++
    if (created >= today) tradesToday++
    if (created >= now - 7 * DAY) {
      tradesWeek++
      gmvWeek += value
    } else if (created >= now - 14 * DAY) {
      tradesPrevWeek++
      gmvPrevWeek += value
    }
    const index = bucket(created)
    if (index >= 0) {
      series[index].trades++
      series[index].gmv += value
    }
    const seller = at(userCountry.get(contract.supplierId))
    const buyer = at(userCountry.get(contract.buyerId))
    for (const stat of new Set([seller, buyer])) {
      if (!stat) continue
      stat.trades++
      if (isActive) stat.activeTrades++
      if (status === 'completed') stat.completedTrades++
    }
    if (seller) seller.exportsUsd += value
    if (buyer) buyer.importsUsd += value
    const title = String(contract.productTitle || 'Other')
    const product = products.get(title) ?? { title, trades: 0, gmv: 0 }
    product.trades++
    product.gmv += value
    products.set(title, product)
  }

  let inTransit = 0
  for (const shipment of data.shipments) {
    if ((shipment.progress ?? 0) >= 100 || shipment.status === 'Delivered') continue
    inTransit++
    const stat = at(resolveCountry(shipment.origin) ?? userCountry.get(shipment.supplierId))
    if (stat) stat.inTransit++
  }

  const list = [...countries.values()]
  const growth = (current: number, previous: number) => (previous ? ((current - previous) / previous) * 100 : current ? 100 : 0)
  const totalUsers = data.users.length - staff

  return {
    at: now,
    totals: {
      users: totalUsers,
      activeNow: active.size,
      companies: data.companies.length,
      verified: list.reduce((sum, item) => sum + item.verified, 0),
      pendingKyc: list.reduce((sum, item) => sum + item.pendingKyc, 0),
      listings: data.lots.length,
      openRfqs: data.rfqs.length,
      trades: data.contracts.length,
      activeTrades,
      gmv,
      inTransit,
      signupsToday,
      tradesToday,
      countriesActive: list.filter(item => item.users > 0).length
    },
    trend: { users: growth(signupsWeek, signupsPrevWeek), trades: growth(tradesWeek, tradesPrevWeek), gmv: growth(gmvWeek, gmvPrevWeek) },
    platforms,
    countries: list,
    series,
    hourly,
    events,
    queues: {
      kyc: data.documents.length,
      disputes,
      payouts: data.payouts.length,
      refunds,
      inbox: data.inbox.length,
      support: data.cases.filter(item => item.category !== 'contract_dispute').length,
      compliance: data.compliance.length
    },
    tradeStatus,
    topProducts: [...products.values()].sort((a, b) => b.gmv - a.gmv).slice(0, 8)
  }
}

type Listener = (snapshot: LiveSnapshot) => void

class LiveHub {
  private data: Partial<Data> = {}
  private listeners = new Set<Listener>()
  private stops: (() => void)[] = []
  private latest: LiveSnapshot | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private clock: ReturnType<typeof setInterval> | null = null
  private idle: ReturnType<typeof setTimeout> | null = null
  private ready: Promise<void> | null = null

  private start() {
    if (this.ready) return this.ready
    const keys = Object.keys(SOURCES) as Key[]
    this.ready = new Promise(resolve => {
      const pending = new Set(keys)
      for (const key of keys) {
        const [collection, query] = SOURCES[key]
        this.stops.push(
          store().watch(collection, query, docs => {
            this.data[key] = docs
            pending.delete(key)
            if (!pending.size) {
              resolve()
              this.schedule()
            }
          })
        )
      }
    })
    this.clock = setInterval(() => this.schedule(), 15_000)
    return this.ready
  }

  private stop() {
    this.stops.forEach(stop => stop())
    this.stops = []
    if (this.clock) clearInterval(this.clock)
    this.clock = null
    this.ready = null
    this.latest = null
    this.data = {}
  }

  private schedule() {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      if (Object.keys(this.data).length < Object.keys(SOURCES).length) return
      this.latest = compute(this.data as Data)
      this.listeners.forEach(listener => listener(this.latest!))
    }, 900)
  }

  private keepAlive() {
    if (this.idle) clearTimeout(this.idle)
    this.idle = setTimeout(() => {
      if (!this.listeners.size) this.stop()
    }, 120_000)
  }

  async snapshot() {
    await this.start()
    this.keepAlive()
    return this.latest ?? compute(this.data as Data)
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    void this.start().then(() => listener(this.latest ?? compute(this.data as Data)))
    return () => {
      this.listeners.delete(listener)
      this.keepAlive()
    }
  }
}

const global = globalThis as unknown as { afrigoLive?: LiveHub }

export const live = () => (global.afrigoLive ??= new LiveHub())
