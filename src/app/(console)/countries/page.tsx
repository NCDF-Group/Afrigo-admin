'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useLive } from '@/lib/client/live'
import { num, usd } from '@/lib/format'
import { COUNTRIES, REGIONS, countryByIso, type Region } from '@/lib/geo/countries'
import { MAP_METRICS } from '@/lib/metrics'
import type { CountryStat } from '@/lib/types'
import { AfricaMap } from '@/components/map/africa-map'
import { Card } from '@/components/ui/card'
import { Chip, SearchInput, Select } from '@/components/ui/field'
import { CountryName } from '@/components/ui/identity'
import { PageHeader, Toolbar } from '@/components/ui/page'
import { Skeleton } from '@/components/ui/states'
import { DataTable, type Column } from '@/components/ui/table'

const regionOf = new Map(COUNTRIES.map(country => [country.iso, country.region]))

export default function CountriesPage() {
  const { snapshot } = useLive()
  const router = useRouter()
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [query, setQuery] = useState('')
  const [metricKey, setMetricKey] = useState('users')
  const metric = MAP_METRICS.find(item => item.key === metricKey) ?? MAP_METRICS[0]

  const rows = useMemo(() => {
    if (!snapshot) return null
    const term = query.trim().toLowerCase()
    return snapshot.countries.filter(stat => (region === 'all' || regionOf.get(stat.iso) === region) && (!term || countryByIso(stat.iso)?.name.toLowerCase().includes(term)))
  }, [snapshot, region, query])

  const scoped = useMemo(() => (snapshot ? snapshot.countries.map(stat => (region === 'all' || regionOf.get(stat.iso) === region ? stat : { ...stat, users: 0, activeNow: 0, trades: 0, exportsUsd: 0, importsUsd: 0, listings: 0, signups7d: 0 })) : []), [snapshot, region])

  const columns: Column<CountryStat>[] = [
    { key: 'country', header: 'Country', cell: row => <CountryName iso={row.iso} className="font-semibold" />, sort: row => countryByIso(row.iso)?.name ?? '' },
    { key: 'active', header: 'Live now', align: 'right', cell: row => <span className={row.activeNow ? 'font-semibold text-success' : 'text-faint'}>{num(row.activeNow)}</span>, sort: row => row.activeNow },
    { key: 'users', header: 'Members', align: 'right', cell: row => num(row.users), sort: row => row.users },
    { key: 'verified', header: 'Verified', align: 'right', cell: row => (row.users ? `${Math.round((row.verified / row.users) * 100)}%` : '0%'), sort: row => (row.users ? row.verified / row.users : 0) },
    { key: 'listings', header: 'Listings', align: 'right', cell: row => num(row.listings), sort: row => row.listings, mobile: false },
    { key: 'trades', header: 'Trades', align: 'right', cell: row => num(row.trades), sort: row => row.trades },
    { key: 'exports', header: 'Exports', align: 'right', cell: row => usd(row.exportsUsd), sort: row => row.exportsUsd },
    { key: 'imports', header: 'Imports', align: 'right', cell: row => usd(row.importsUsd), sort: row => row.importsUsd, mobile: false },
    { key: 'signups', header: 'New this week', align: 'right', cell: row => num(row.signups7d), sort: row => row.signups7d, mobile: false, className: 'hidden 2xl:table-cell' }
  ]

  return (
    <>
      <PageHeader title="Countries" description="Real time statistics for every African market. Figures update the moment members act on the web or mobile apps." />
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="p-5 xl:sticky xl:top-24 xl:self-start">
          <Select value={metricKey} onChange={event => setMetricKey(event.target.value)} aria-label="Map metric" className="mb-4">
            {MAP_METRICS.map(item => (
              <option key={item.key} value={item.key}>
                Shade by {item.label.toLowerCase()}
              </option>
            ))}
          </Select>
          {snapshot ? <AfricaMap stats={scoped} metric={metric} events={snapshot.events} onSelect={iso => router.push(`/countries/${iso}`)} details={stat => [{ label: 'Members', value: num(stat.users) }, { label: 'Trades', value: num(stat.trades) }]} /> : <Skeleton className="aspect-[800/860] w-full" />}
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <Toolbar>
            <SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a country" className="sm:w-64" />
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              <Chip active={region === 'all'} onClick={() => setRegion('all')}>
                All regions
              </Chip>
              {REGIONS.map(item => (
                <Chip key={item.id} active={region === item.id} onClick={() => setRegion(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
          </Toolbar>
          <DataTable rows={rows} columns={columns} rowKey={row => row.iso} onRowClick={row => router.push(`/countries/${row.iso}`)} defaultSort={{ key: 'users', direction: 'desc' }} pageSize={15} empty={{ title: 'No countries match' }} />
        </Card>
      </div>
    </>
  )
}
