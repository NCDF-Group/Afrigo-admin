'use client'
import { ArrowDownRight, ArrowUpRight, Globe, Monitor, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { ago, humanize, pct } from '@/lib/format'
import { countryByIso } from '@/lib/geo/countries'
import { PLATFORM_LABELS, type Platform } from '@/lib/roles'
import type { LiveEvent } from '@/lib/types'
import { Sparkline } from '@/components/charts/charts'
import { Flag } from '@/components/ui/identity'
import { Skeleton } from '@/components/ui/states'

export function Kpi({ label, value, trend, spark, hint, icon: Icon }: { label: string; value: string; trend?: number; spark?: number[]; hint?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="card flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-muted">{label}</span>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-faint" /> : null}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="tabular font-display text-[26px] font-bold leading-none tracking-tight">{value}</span>
        {trend !== undefined ? (
          <span className={cn('tabular inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold', trend >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {pct(trend)}
          </span>
        ) : null}
      </div>
      {spark ? <Sparkline values={spark} className="mt-3" /> : null}
      {hint ? <p className="mt-2 truncate text-xs text-faint">{hint}</p> : null}
    </div>
  )
}

export function KpiSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-4 h-8 w-full" />
    </div>
  )
}

export const PLATFORM_ICON: Record<Platform, React.ComponentType<{ className?: string }>> = { web: Monitor, ios: Smartphone, android: Smartphone }

export function EventFeed({ events, now, limit = 14 }: { events: LiveEvent[]; now: number; limit?: number }) {
  return (
    <ul className="divide-y divide-line/70">
      {events.slice(0, limit).map(event => {
        const Icon = PLATFORM_ICON[event.platform]
        return (
          <li key={event.id} className="flex animate-rise items-center gap-3 px-5 py-3">
            {event.country ? <Flag iso={event.country} /> : <Globe className="h-3.5 w-5 text-faint" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{event.label}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                {countryByIso(event.country)?.name ?? 'Unknown country'}
                {event.role ? <span>· {humanize(event.role)}</span> : null}
              </p>
            </div>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="tabular text-xs text-faint">{ago(event.at, now)}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                <Icon className="h-3 w-3" />
                {PLATFORM_LABELS[event.platform]}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function QueueLink({ href, label, count, icon: Icon }: { href: string; label: string; count: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-primary/40 hover:bg-subtle">
      <span className={cn('grid h-9 w-9 place-items-center rounded-lg', count ? 'bg-accent-soft text-primary' : 'bg-subtle text-faint')}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-[13.5px] font-semibold">{label}</span>
      <span className={cn('tabular font-display text-lg font-bold', !count && 'text-faint')}>{count}</span>
    </Link>
  )
}
