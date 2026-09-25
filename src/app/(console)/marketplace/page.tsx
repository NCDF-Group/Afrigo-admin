'use client'
import { Archive, Eye, EyeOff, Lock, RotateCcw, Unlock, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/client/api'
import { date, humanize, money, num } from '@/lib/format'
import { resolveCountry } from '@/lib/geo/countries'
import { useConfirm, useMutation } from '@/components/ui/action'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchInput, Select } from '@/components/ui/field'
import { CountryName, PersonCell } from '@/components/ui/identity'
import { PageHeader, Toolbar } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { DataTable, type Column } from '@/components/ui/table'

type Kind = 'lots' | 'rfqs' | 'bids'
type Row = Record<string, any> & { id: string; owner: { id: string; name: string; country: string | null } | null }

const STATUSES: Record<Kind, string[]> = { lots: ['active', 'archived'], rfqs: ['Open', 'Awarded', 'Closed'], bids: ['Submitted', 'Awarded', 'Declined'] }

export default function MarketplacePage() {
  const [kind, setKind] = useState<Kind>('lots')
  const { data, error, loading, reload, setData } = useApi<{ items: Row[] }>(`/api/marketplace?kind=${kind}`)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const { run, busy } = useMutation()
  const { ask, dialog } = useConfirm()

  const rows = useMemo(() => {
    if (!data) return null
    const term = query.trim().toLowerCase()
    return data.items.filter(item => (!status || item.status === status) && (!term || `${item.title ?? ''} ${item.summary ?? ''} ${item.owner?.name ?? ''}`.toLowerCase().includes(term)))
  }, [data, query, status])

  const moderate = async (row: Row, action: string, reason = '') => {
    const result = await run<{ change: Record<string, unknown> }>(`${row.id}:${action}`, '/api/marketplace', { json: { kind, id: row.id, action, reason } }, `${humanize(action)} done`)
    if (result && data) setData({ items: data.items.map(item => (item.id === row.id ? { ...item, ...result.change } : item)) })
    return result
  }

  const withReason = (row: Row, action: string, title: string) => ask({ title, description: 'The member is notified in the app. Your note is saved to the audit log.', confirmLabel: humanize(action), tone: 'danger', reason: 'required', onConfirm: ({ reason }) => moderate(row, action, reason) })

  const action = (row: Row, name: string, label: string, Icon: React.ComponentType<{ className?: string }>, destructive = false) => (
    <Button key={name} size="sm" variant="ghost" loading={busy === `${row.id}:${name}`} onClick={() => (destructive ? withReason(row, name, `${label}?`) : void moderate(row, name))}>
      <Icon className="h-4 w-4" /> {label}
    </Button>
  )

  const visibility = (row: Row) => (row.visibility === 'public' ? action(row, 'private', 'Hide', EyeOff) : action(row, 'public', 'Publish', Eye))

  const controls = (row: Row) => (
    <span className="flex justify-end gap-1">
      {kind === 'lots' ? [visibility(row), row.status === 'active' ? action(row, 'archive', 'Archive', Archive, true) : action(row, 'restore', 'Restore', RotateCcw)] : null}
      {kind === 'rfqs' ? [visibility(row), row.status === 'Open' ? action(row, 'close', 'Close', Lock, true) : row.status === 'Closed' ? action(row, 'reopen', 'Reopen', Unlock) : null] : null}
      {kind === 'bids' && row.status === 'Submitted' ? action(row, 'decline', 'Decline', X, true) : null}
    </span>
  )

  const title: Column<Row> = {
    key: 'title',
    header: kind === 'bids' ? 'Bid' : 'Product',
    sort: row => row.title ?? '',
    cell: row => (
      <span className="min-w-0">
        <span className="block truncate font-semibold">{kind === 'bids' ? `${money(Number(row.price || 0), row.currency || 'USD')} per unit` : row.title}</span>
        <span className="block truncate text-xs text-muted">{kind === 'bids' ? row.delivery || 'No delivery terms' : row.grade || row.summary || 'No description'}</span>
      </span>
    )
  }

  const columns: Column<Row>[] = [
    title,
    { key: 'owner', header: kind === 'rfqs' ? 'Buyer' : 'Seller', cell: row => <PersonCell person={row.owner} /> },
    ...(kind === 'bids'
      ? []
      : [
          { key: 'quantity', header: 'Quantity', align: 'right' as const, cell: (row: Row) => `${num(row.quantity)} ${row.unit ?? ''}`, sort: (row: Row) => Number(row.quantity || 0) },
          kind === 'lots'
            ? { key: 'price', header: 'Price', align: 'right' as const, cell: (row: Row) => money(Number(row.price || 0), row.currency || 'USD'), sort: (row: Row) => Number(row.price || 0) }
            : { key: 'dest', header: 'Destination', cell: (row: Row) => <CountryName iso={resolveCountry(row.destination_country)} /> },
          { key: 'visibility', header: 'Visibility', cell: (row: Row) => <StatusBadge status={row.visibility ?? 'private'} />, mobile: false }
        ]),
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} />, sort: row => row.status },
    { key: 'created', header: 'Posted', align: 'right', cell: row => <span className="text-muted">{date(row.createdAt)}</span>, sort: row => row.createdAt ?? 0, mobile: false },
    { key: 'actions', header: '', align: 'right', cell: controls }
  ]

  return (
    <>
      <PageHeader title="Marketplace" description="Moderate product listings, buyer requests and supplier bids that appear on the web and in the mobile apps." />
      <Card className="overflow-hidden">
        <Toolbar>
          <Segmented
            value={kind}
            onChange={value => {
              setKind(value)
              setStatus('')
            }}
            options={[
              { value: 'lots', label: 'Listings' },
              { value: 'rfqs', label: 'Buyer requests' },
              { value: 'bids', label: 'Bids' }
            ]}
          />
          <SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products or members" className="sm:w-64" />
          <Select value={status} onChange={event => setStatus(event.target.value)} aria-label="Status" className="sm:w-40">
            <option value="">Any status</option>
            {STATUSES[kind].map(item => (
              <option key={item} value={item}>
                {humanize(item)}
              </option>
            ))}
          </Select>
        </Toolbar>
        <DataTable key={kind} rows={rows} columns={columns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'created', direction: 'desc' }} empty={{ title: 'Nothing to moderate here' }} />
      </Card>
      {dialog}
    </>
  )
}
