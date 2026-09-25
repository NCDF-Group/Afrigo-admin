'use client'
import { Download } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { useApi } from '@/lib/client/api'
import { ago, date, humanize } from '@/lib/format'
import { COUNTRIES } from '@/lib/geo/countries'
import { MEMBER_ROLES, PLATFORMS, PLATFORM_LABELS } from '@/lib/roles'
import { MemberSheet, type Member } from '@/components/members/member-sheet'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchInput, Select } from '@/components/ui/field'
import { Avatar, CountryName } from '@/components/ui/identity'
import { PageHeader, Toolbar } from '@/components/ui/page'
import { DataTable, type Column } from '@/components/ui/table'

function exportCsv(rows: Member[]) {
  const header = ['Name', 'Email', 'Role', 'Country', 'Company', 'KYC', 'Status', 'Platform', 'Joined']
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const body = rows.map(row => [row.name, row.email, row.role, row.country, row.company, row.kycStatus, row.status, row.platform, row.createdAt ? new Date(row.createdAt).toISOString() : ''].map(escape).join(','))
  const url = URL.createObjectURL(new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: `afrigo-members-${new Date().toISOString().slice(0, 10)}.csv` })
  link.click()
  URL.revokeObjectURL(url)
}

function Members() {
  const params = useSearchParams()
  const { data, error, loading, reload } = useApi<{ items: Member[] }>('/api/users')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [country, setCountry] = useState(params.get('country') ?? '')
  const [kyc, setKyc] = useState('')
  const [platform, setPlatform] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const rows = useMemo(() => {
    if (!data) return null
    const term = query.trim().toLowerCase()
    return data.items.filter(
      item =>
        (!term || `${item.name} ${item.email} ${item.company ?? ''}`.toLowerCase().includes(term)) &&
        (!role || item.role === role) &&
        (!country || item.country === country) &&
        (!kyc || item.kycStatus === kyc) &&
        (!platform || item.platform === platform) &&
        (!status || item.status === status)
    )
  }, [data, query, role, country, kyc, platform, status])

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      sort: row => row.name.toLowerCase(),
      cell: row => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={row.name} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{row.name}</span>
            <span className="block truncate text-xs text-muted">{row.email}</span>
          </span>
        </span>
      )
    },
    { key: 'role', header: 'Role', cell: row => <Badge tone="brand">{row.role}</Badge>, sort: row => row.role },
    { key: 'country', header: 'Country', cell: row => <CountryName iso={row.country} />, sort: row => row.country ?? '' },
    { key: 'kyc', header: 'Verification', cell: row => <StatusBadge status={row.kycStatus} />, sort: row => row.kycStatus },
    { key: 'platform', header: 'App', cell: row => <span className="text-muted">{PLATFORM_LABELS[row.platform as keyof typeof PLATFORM_LABELS] ?? row.platform}{row.appVersion ? ` ${row.appVersion}` : ''}</span>, sort: row => row.platform },
    { key: 'status', header: 'Account', cell: row => <StatusBadge status={row.status} />, sort: row => row.status, mobile: false },
    { key: 'seen', header: 'Last seen', align: 'right', cell: row => <span className="text-muted">{ago(row.lastActiveAt)}</span>, sort: row => row.lastActiveAt ?? 0 },
    { key: 'joined', header: 'Joined', align: 'right', cell: row => <span className="text-muted">{date(row.createdAt)}</span>, sort: row => row.createdAt ?? 0, mobile: false }
  ]

  return (
    <>
      <PageHeader
        title="Members"
        description="Every buyer, seller and exporter on the web and mobile apps. Verify businesses, change roles, and suspend accounts."
        actions={
          <Button onClick={() => rows && exportCsv(rows)} disabled={!rows?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email or company" className="sm:w-72" />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select value={role} onChange={event => setRole(event.target.value)} aria-label="Role" className="sm:w-36">
              <option value="">All roles</option>
              {MEMBER_ROLES.map(item => (
                <option key={item}>{item}</option>
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
            <Select value={kyc} onChange={event => setKyc(event.target.value)} aria-label="Verification" className="sm:w-40">
              <option value="">Any verification</option>
              {['verified', 'pending', 'rejected', 'not_started'].map(item => (
                <option key={item} value={item}>
                  {humanize(item)}
                </option>
              ))}
            </Select>
            <Select value={platform} onChange={event => setPlatform(event.target.value)} aria-label="App" className="sm:w-36">
              <option value="">All apps</option>
              {PLATFORMS.map(item => (
                <option key={item} value={item}>
                  {PLATFORM_LABELS[item]}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={event => setStatus(event.target.value)} aria-label="Account status" className="sm:w-36">
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
        </Toolbar>
        <DataTable rows={rows} columns={columns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} onRowClick={row => setSelected(row.id)} defaultSort={{ key: 'joined', direction: 'desc' }} empty={{ title: 'No members match these filters' }} />
      </Card>
      <MemberSheet id={selected} onClose={() => setSelected(null)} onChanged={reload} />
    </>
  )
}

export default function MembersPage() {
  return (
    <Suspense>
      <Members />
    </Suspense>
  )
}
