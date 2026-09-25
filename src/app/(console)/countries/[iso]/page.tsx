'use client'
import { ArrowLeft, Activity, BadgeCheck, Handshake, Package, Truck, Users } from 'lucide-react'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useLive } from '@/lib/client/live'
import { num, usd } from '@/lib/format'
import { countryByIso, regionLabel } from '@/lib/geo/countries'
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/roles'
import { BarList, Donut } from '@/components/charts/charts'
import { EventFeed, Kpi, KpiSkeleton } from '@/components/dashboard/widgets'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { Flag } from '@/components/ui/identity'
import { PageHeader } from '@/components/ui/page'
import { Empty, Skeleton } from '@/components/ui/states'

export default function CountryPage() {
  const { iso } = useParams<{ iso: string }>()
  const country = countryByIso(iso)
  const { snapshot } = useLive()
  if (!country) notFound()

  const stat = snapshot?.countries.find(item => item.iso === country.iso)
  const rank = snapshot && stat ? [...snapshot.countries].sort((a, b) => b.users - a.users).findIndex(item => item.iso === stat.iso) + 1 : null
  const events = snapshot?.events.filter(event => event.country === country.iso) ?? []

  return (
    <>
      <Link href="/countries" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> All countries
      </Link>
      <PageHeader
        title={country.name}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Flag iso={country.iso} className="h-5 w-7" />
            <Badge>{regionLabel(country.region)}</Badge>
            <Badge>{country.currency}</Badge>
            {rank ? <Badge tone="brand">Rank #{rank} by members</Badge> : null}
          </div>
        }
        description="Live market statistics. Every figure refreshes as members sign up, list, trade and ship."
        actions={
          <Link href={`/users?country=${country.iso}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-subtle">
            <Users className="h-4 w-4" /> View members
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stat ? (
          <>
            <Kpi label="Active right now" value={num(stat.activeNow)} icon={Activity} hint={`${num(stat.signups7d)} new members this week`} />
            <Kpi label="Members" value={num(stat.users)} icon={Users} hint={`${num(stat.companies)} registered businesses`} />
            <Kpi label="Trades" value={num(stat.trades)} icon={Handshake} hint={`${num(stat.activeTrades)} in progress, ${num(stat.completedTrades)} completed`} />
            <Kpi label="Export value" value={usd(stat.exportsUsd)} icon={Truck} hint={`${usd(stat.importsUsd)} imported`} />
          </>
        ) : (
          Array.from({ length: 4 }, (_, index) => <KpiSkeleton key={index} />)
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Member mix" description="By trade role" />
          <div className="p-5">
            {stat ? (
              <BarList
                format={num}
                items={[
                  { key: 'buyers', label: 'Buyers', value: stat.buyers },
                  { key: 'sellers', label: 'Sellers', value: stat.sellers },
                  { key: 'exporters', label: 'Exporters', value: stat.exporters }
                ]}
              />
            ) : (
              <Skeleton className="h-32" />
            )}
            {stat ? (
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px]">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-success" />
                  <dt className="text-muted">Verified</dt>
                  <dd className="tabular ml-auto font-semibold">{num(stat.verified)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-warning" />
                  <dt className="text-muted">Pending</dt>
                  <dd className="tabular ml-auto font-semibold">{num(stat.pendingKyc)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-faint" />
                  <dt className="text-muted">Listings</dt>
                  <dd className="tabular ml-auto font-semibold">{num(stat.listings)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-faint" />
                  <dt className="text-muted">Shipping</dt>
                  <dd className="tabular ml-auto font-semibold">{num(stat.inTransit)}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Web and mobile" description="Where members in this market use Afrigo" />
          <div className="p-5">
            {stat ? <Donut center={num(stat.users)} sub="members" format={num} slices={PLATFORMS.map(platform => ({ key: platform, label: PLATFORM_LABELS[platform], value: stat.platforms[platform], color: `var(--viz-${platform})` }))} /> : <Skeleton className="h-40" />}
          </div>
        </Card>

        <Card className="flex max-h-[460px] flex-col overflow-hidden">
          <CardHeader title="Recent activity" description={`Latest events from ${country.name}`} />
          <div className="mt-3 flex-1 overflow-y-auto border-t border-line">{events.length ? <EventFeed events={events} now={snapshot!.at} /> : <Empty title="Quiet for now" description="New events from this market appear here instantly." />}</div>
        </Card>
      </div>
    </>
  )
}
