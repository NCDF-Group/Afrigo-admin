import type { Platform } from './roles'

export type PlatformCounts = Record<Platform, number>

export type CountryStat = {
  iso: string
  users: number
  buyers: number
  sellers: number
  exporters: number
  companies: number
  verified: number
  pendingKyc: number
  listings: number
  openRfqs: number
  trades: number
  activeTrades: number
  completedTrades: number
  exportsUsd: number
  importsUsd: number
  inTransit: number
  activeNow: number
  signups7d: number
  platforms: PlatformCounts
}

export type LiveEvent = {
  id: string
  type: string
  label: string
  country: string | null
  platform: Platform
  role: string | null
  actorId: string | null
  at: number
}

export type SeriesPoint = { day: number; signups: number; trades: number; gmv: number }

export type Queues = { kyc: number; disputes: number; payouts: number; refunds: number; inbox: number; support: number; compliance: number }

export type LiveSnapshot = {
  at: number
  totals: {
    users: number
    activeNow: number
    companies: number
    verified: number
    pendingKyc: number
    listings: number
    openRfqs: number
    trades: number
    activeTrades: number
    gmv: number
    inTransit: number
    signupsToday: number
    tradesToday: number
    countriesActive: number
  }
  trend: { users: number; trades: number; gmv: number }
  platforms: Record<Platform, { users: number; activeNow: number; eventsToday: number }>
  countries: CountryStat[]
  series: SeriesPoint[]
  hourly: number[]
  events: LiveEvent[]
  queues: Queues
  tradeStatus: Record<string, number>
  topProducts: { title: string; trades: number; gmv: number }[]
}

export type ListResponse<T> = { ok: true; items: T[] }
