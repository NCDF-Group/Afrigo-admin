'use client'
import { Activity, BadgeCheck, Coins, Handshake, Mail, Scale, ShieldAlert, Truck, Users, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useLive } from '@/lib/client/live'
import { useSession } from '@/lib/client/session'
import { humanize, num, short, usd } from '@/lib/format'
import { countryByIso } from '@/lib/geo/countries'
import { MAP_METRICS } from '@/lib/metrics'
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/roles'
import { AreaChart, BarList, Bars, Donut } from '@/components/charts/charts'
import { EventFeed, Kpi, KpiSkeleton, QueueLink } from '@/components/dashboard/widgets'
import { AfricaMap } from '@/components/map/africa-map'
import { Card, CardHeader } from '@/components/ui/card'
import { Select } from '@/components/ui/field'
import { Flag } from '@/components/ui/identity'
import { PageHeader } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/states'

type Trend = 'signups' | 'trades' | 'gmv'

const dayLabel = (time: number) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(time)

export default function OverviewPage() {
  const { snapshot } = useLive()
  const { staff } = useSession()
  const router = useRouter()
  const [metricKey, setMetricKey] = useState('users')
  const [trend, setTrend] = useState<Trend>('signups')
  const metric = MAP_METRICS.find(item => item.key === metricKey) ?? MAP_METRICS[0]

  const ranked = useMemo(() => (snapshot ? [...snapshot.countries].sort((a, b) => metric.value(b) - metric.value(a)).filter(stat => metric.value(stat) > 0).slice(0, 8) : []), [snapshot, metric])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  }, [])

  const points = snapshot?.series.map(point => ({ x: point.day, y: point[trend], label: dayLabel(point.day) })) ?? []
  const totals = snapshot?.totals

  return (
    <>
      <PageHeader title={`${greeting}, ${staff?.name.split(' ')[0] ?? 'there'}`} description="A live view of Afrigo across every African market, the web app and both mobile apps." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {totals ? (
          <>
            <Kpi label="Active right now" value={num(totals.activeNow)} icon={Activity} hint={`${num(snapshot!.hourly.reduce((a, b) => a + b, 0))} events in the last 24h`} spark={snapshot!.hourly} />
            <Kpi label="Members" value={short(totals.users)} icon={Users} trend={snapshot!.trend.users} spark={snapshot!.series.map(point => point.signups)} hint={`${num(totals.signupsToday)} joined today`} />
            <Kpi label="Trades" value={short(totals.trades)} icon={Handshake} trend={snapshot!.trend.trades} spark={snapshot!.series.map(point => point.trades)} hint={`${num(totals.activeTrades)} in progress`} />
            <Kpi label="Settled value" value={usd(totals.gmv)} icon={Coins} trend={snapshot!.trend.gmv} spark={snapshot!.series.map(point => point.gmv)} hint={`${num(totals.inTransit)} shipments in transit`} />
          </>
        ) : (
          Array.from({ length: 4 }, (_, index) => <KpiSkeleton key={index} />)
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Africa at a glance"
            description={totals ? `${totals.countriesActive} of 55 markets have members. Pulses mark live activity.` : 'Loading live statistics'}
            action={
              <Select value={metricKey} onChange={event => setMetricKey(event.target.value)} aria-label="Map metric" className="w-40">
                {MAP_METRICS.map(item => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </Select>
            }
          />
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {snapshot ? (
              <AfricaMap
                stats={snapshot.countries}
                metric={metric}
                events={snapshot.events}
                onSelect={iso => router.push(`/countries/${iso}`)}
                details={stat => [
                  { label: 'Active now', value: num(stat.activeNow) },
                  { label: 'Members', value: num(stat.users) },
                  { label: 'Trades', value: num(stat.trades) },
                  { label: 'Exports', value: usd(stat.exportsUsd) }
                ]}
              />
            ) : (
              <Skeleton className="aspect-[800/860] w-full" />
            )}
            <div className="min-w-0">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-faint">Leading markets</p>
              <BarList
                format={metric.format}
                items={ranked.map(stat => ({
                  key: stat.iso,
                  value: metric.value(stat),
                  label: (
                    <Link href={`/countries/${stat.iso}`} className="flex items-center gap-2 hover:underline">
                      <Flag iso={stat.iso} />
                      {countryByIso(stat.iso)?.name}
                    </Link>
                  )
                }))}
              />
              <Link href="/countries" className="mt-4 inline-block text-[13px] font-semibold text-primary hover:underline">
                See all 55 markets
              </Link>
            </div>
          </div>
        </Card>

        <Card className="flex max-h-[720px] flex-col overflow-hidden">
          <CardHeader title="Live activity" description="Events streaming from web, iOS and Android" action={<Link href="/activity" className="text-[13px] font-semibold text-primary hover:underline">View all</Link>} />
          <div className="mt-3 flex-1 overflow-y-auto border-t border-line">{snapshot ? <EventFeed events={snapshot.events} now={snapshot.at} limit={20} /> : <div className="space-y-3 p-5">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-10" />)}</div>}</div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Last 30 days"
            description={trend === 'gmv' ? 'Settled trade value in USD' : trend === 'trades' ? 'New trades opened per day' : 'New members per day'}
            action={
              <Segmented
                value={trend}
                onChange={setTrend}
                options={[
                  { value: 'signups', label: 'Signups' },
                  { value: 'trades', label: 'Trades' },
                  { value: 'gmv', label: 'Value' }
                ]}
              />
            }
          />
          <div className="p-5 pt-4">{snapshot ? <AreaChart points={points} format={trend === 'gmv' ? value => usd(value) : short} label={`Daily ${trend}`} /> : <Skeleton className="h-[220px]" />}</div>
        </Card>

        <Card>
          <CardHeader title="Web and mobile" description="Members by the app they use most" />
          <div className="p-5">
            {snapshot ? (
              <>
                <Donut
                  center={short(totals!.users)}
                  sub="members"
                  format={num}
                  slices={PLATFORMS.map(platform => ({ key: platform, label: PLATFORM_LABELS[platform], value: snapshot.platforms[platform].users, color: `var(--viz-${platform})` }))}
                />
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                  {PLATFORMS.map(platform => (
                    <div key={platform}>
                      <p className="tabular font-display text-lg font-bold">{num(snapshot.platforms[platform].activeNow)}</p>
                      <p className="text-[11px] text-muted">{PLATFORM_LABELS[platform]} live</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Skeleton className="h-56" />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Needs attention" description="Open work across the operation" />
          <div className="grid gap-2 p-5">
            <QueueLink href="/verification" label="Verification requests" count={snapshot?.queues.kyc ?? 0} icon={BadgeCheck} />
            <QueueLink href="/verification" label="Compliance checks" count={snapshot?.queues.compliance ?? 0} icon={ShieldAlert} />
            <QueueLink href="/disputes" label="Open disputes" count={snapshot?.queues.disputes ?? 0} icon={Scale} />
            <QueueLink href="/finance" label="Payouts and refunds" count={(snapshot?.queues.payouts ?? 0) + (snapshot?.queues.refunds ?? 0)} icon={Wallet} />
            <QueueLink href="/inbox" label="Unread enquiries" count={snapshot?.queues.inbox ?? 0} icon={Mail} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Activity by hour" description="Platform events over the last 24 hours" />
          <div className="p-5 pt-8">
            {snapshot ? (
              <Bars
                values={snapshot.hourly}
                label="Events per hour, last 24 hours"
                format={value => `${num(value)} events`}
                labels={snapshot.hourly.map((_, index) => {
                  const hour = new Date(snapshot.at - (23 - index) * 3_600_000).getHours()
                  return `${String(hour).padStart(2, '0')}:00`
                })}
                height={150}
              />
            ) : (
              <Skeleton className="h-40" />
            )}
            {snapshot ? (
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-4">
                {Object.entries(snapshot.tradeStatus)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-[13px]">
                      <span className="text-muted">{humanize(status)}</span>
                      <span className="tabular font-semibold">{num(count)}</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top commodities" description="By settled trade value" action={<Truck className="h-4 w-4 text-faint" />} />
          <div className="p-5">{snapshot ? <BarList format={value => usd(value)} items={snapshot.topProducts.map(product => ({ key: product.title, label: product.title, value: product.gmv }))} /> : <Skeleton className="h-56" />}</div>
        </Card>
      </div>
    </>
  )
}
