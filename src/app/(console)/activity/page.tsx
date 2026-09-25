'use client'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { dateTime, humanize } from '@/lib/format'
import { COUNTRIES } from '@/lib/geo/countries'
import { PLATFORMS, PLATFORM_LABELS } from '@/lib/roles'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SearchInput, Select } from '@/components/ui/field'
import { CountryName, PersonCell } from '@/components/ui/identity'
import { PageHeader, Toolbar } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { DataTable, type Column } from '@/components/ui/table'

type Person = { id: string; name: string; country: string | null } | null
type MemberEvent = { id: string; type: string; label: string; role: string | null; platform: string; country: string | null; actor: Person; createdAt: number }
type Audit = { id: string; actorEmail: string; actorRole: string; action: string; target: string; detail: Record<string, unknown>; createdAt: number }

function PlatformLog() {
  const { data, error, loading, reload } = useApi<{ items: MemberEvent[] }>('/api/activity')
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('')
  const [country, setCountry] = useState('')
  const rows = useMemo(() => {
    if (!data) return null
    const term = query.trim().toLowerCase()
    return data.items.filter(item => (!platform || item.platform === platform) && (!country || item.country === country) && (!term || `${item.label} ${item.actor?.name ?? ''} ${item.type}`.toLowerCase().includes(term)))
  }, [data, query, platform, country])

  const columns: Column<MemberEvent>[] = [
    { key: 'label', header: 'Event', cell: row => <span className="min-w-0"><span className="block truncate font-semibold">{row.label}</span><span className="text-xs text-muted">{humanize(row.type)}</span></span> },
    { key: 'actor', header: 'Member', cell: row => <PersonCell person={row.actor} sub={row.role ? <span className="text-xs text-muted">{row.role}</span> : null} /> },
    { key: 'country', header: 'Country', cell: row => <CountryName iso={row.country} /> },
    { key: 'platform', header: 'App', cell: row => <Badge>{PLATFORM_LABELS[row.platform as keyof typeof PLATFORM_LABELS] ?? row.platform}</Badge> },
    { key: 'time', header: 'Time', align: 'right', cell: row => <span className="text-muted">{dateTime(row.createdAt)}</span>, sort: row => row.createdAt }
  ]

  return (
    <>
      <Toolbar>
        <SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search events or members" className="sm:w-72" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={platform} onChange={event => setPlatform(event.target.value)} aria-label="App" className="sm:w-36">
            <option value="">All apps</option>
            {PLATFORMS.map(item => (
              <option key={item} value={item}>
                {PLATFORM_LABELS[item]}
              </option>
            ))}
          </Select>
          <Select value={country} onChange={event => setCountry(event.target.value)} aria-label="Country" className="sm:w-48">
            <option value="">All countries</option>
            {COUNTRIES.map(item => (
              <option key={item.iso} value={item.iso}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>
      <DataTable rows={rows} columns={columns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'time', direction: 'desc' }} pageSize={20} empty={{ title: 'No events match' }} />
    </>
  )
}

function AuditLog() {
  const { data, error, loading, reload } = useApi<{ items: Audit[] }>('/api/activity?source=admin')
  const columns: Column<Audit>[] = [
    { key: 'action', header: 'Action', cell: row => <span className="font-mono text-[12.5px] font-semibold">{row.action}</span>, sort: row => row.action },
    { key: 'actor', header: 'By', cell: row => <span className="min-w-0"><span className="block truncate">{row.actorEmail}</span><span className="text-xs text-muted">{humanize(row.actorRole)}</span></span> },
    { key: 'target', header: 'Target', cell: row => <span className="font-mono text-xs text-muted">{row.target}</span>, mobile: false },
    { key: 'detail', header: 'Detail', cell: row => <span className="block max-w-xs truncate text-muted">{Object.entries(row.detail ?? {}).filter(([, value]) => value !== null && value !== '').map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join(', ') || 'None'}</span>, mobile: false },
    { key: 'time', header: 'Time', align: 'right', cell: row => <span className="text-muted">{dateTime(row.createdAt)}</span>, sort: row => row.createdAt }
  ]
  return <DataTable rows={data?.items ?? null} columns={columns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'time', direction: 'desc' }} pageSize={20} empty={{ title: 'No admin actions yet', description: 'Every change made in this console is recorded here.' }} />
}

export default function ActivityPage() {
  const { can } = useSession()
  const [tab, setTab] = useState<'platform' | 'audit'>('platform')
  return (
    <>
      <PageHeader title="Activity" description="What members are doing across the apps, and what staff have changed in this console." />
      <Card className="overflow-hidden">
        {can('staff:manage') ? (
          <Toolbar>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'platform', label: 'Member activity' },
                { value: 'audit', label: 'Admin audit log' }
              ]}
            />
          </Toolbar>
        ) : null}
        {tab === 'platform' ? <PlatformLog /> : <AuditLog />}
      </Card>
    </>
  )
}
