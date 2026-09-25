'use client'
import { Ban, Flag as FlagIcon, Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { date, dateTime, humanize, money, num, usd } from '@/lib/format'
import { Meter } from '@/components/charts/charts'
import { useConfirm, useMutation } from '@/components/ui/action'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip, SearchInput } from '@/components/ui/field'
import { PersonCell } from '@/components/ui/identity'
import { Detail, PageHeader, Section, Toolbar } from '@/components/ui/page'
import { Sheet } from '@/components/ui/sheet'
import { DataTable, type Column } from '@/components/ui/table'

type Person = { id: string; name: string; country: string | null } | null
type Trade = {
  id: string
  product: string
  quantity: number | null
  amount: number
  currency: string
  usd: number
  status: string
  paymentStatus: string
  payoutStatus: string
  refundStatus: string | null
  flagged: boolean
  buyer: Person
  seller: Person
  exporter: Person
  shipment: { id: string; status: string; progress: number; carrier: string | null } | null
  disputeReason: string | null
  createdAt: number | null
  updatedAt: number | null
}

const DONE: Record<string, string> = { cancel: 'Trade cancelled', flag: 'Trade flagged for review', unflag: 'Flag removed', dispute: 'Dispute opened' }

const FILTERS = ['all', 'pending', 'accepted', 'paid', 'shipping', 'completed', 'disputed', 'cancelled', 'flagged'] as const

export default function TradesPage() {
  const { data, error, loading, reload } = useApi<{ items: Trade[] }>('/api/trades')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Trade | null>(null)
  const { can } = useSession()
  const { run, busy } = useMutation()
  const { ask, dialog } = useConfirm()

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: data?.items.length ?? 0, flagged: 0 }
    for (const item of data?.items ?? []) {
      result[item.status] = (result[item.status] ?? 0) + 1
      if (item.flagged) result.flagged++
    }
    return result
  }, [data])

  const rows = useMemo(() => {
    if (!data) return null
    const term = query.trim().toLowerCase()
    return data.items.filter(item => (filter === 'all' || (filter === 'flagged' ? item.flagged : item.status === filter)) && (!term || `${item.product} ${item.buyer?.name ?? ''} ${item.seller?.name ?? ''} ${item.id}`.toLowerCase().includes(term)))
  }, [data, filter, query])

  const act = async (trade: Trade, action: string, reason = '') => {
    const result = await run(`${trade.id}:${action}`, '/api/trades', { json: { id: trade.id, action, reason } }, DONE[action])
    if (result) {
      await reload()
      setSelected(null)
    }
    return result
  }

  const columns: Column<Trade>[] = [
    {
      key: 'product',
      header: 'Trade',
      sort: row => row.product,
      cell: row => (
        <span className="min-w-0">
          <span className="flex items-center gap-2 truncate font-semibold">
            {row.product}
            {row.flagged ? <FlagIcon className="h-3.5 w-3.5 shrink-0 text-danger" /> : null}
          </span>
          <span className="font-mono text-[11px] text-faint">{row.id.slice(0, 10)}</span>
        </span>
      )
    },
    { key: 'buyer', header: 'Buyer', cell: row => <PersonCell person={row.buyer} /> },
    { key: 'seller', header: 'Seller', cell: row => <PersonCell person={row.seller} />, mobile: false },
    { key: 'value', header: 'Value', align: 'right', cell: row => <span className="min-w-0"><span className="block font-semibold">{money(row.amount, row.currency)}</span>{row.currency !== 'USD' ? <span className="text-xs text-faint">{usd(row.usd)}</span> : null}</span>, sort: row => row.usd },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} />, sort: row => row.status },
    { key: 'created', header: 'Opened', align: 'right', cell: row => <span className="text-muted">{date(row.createdAt)}</span>, sort: row => row.createdAt ?? 0 }
  ]

  const decide = can('disputes:decide')

  return (
    <>
      <PageHeader title="Trades" description="Every contract between buyers and sellers, from reservation to delivery and settlement." />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product, member or ID" className="sm:w-72" />
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {FILTERS.map(item => (
              <Chip key={item} active={filter === item} onClick={() => setFilter(item)}>
                {humanize(item)} <span className="tabular opacity-70">{num(counts[item] ?? 0)}</span>
              </Chip>
            ))}
          </div>
        </Toolbar>
        <DataTable rows={rows} columns={columns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} onRowClick={setSelected} defaultSort={{ key: 'created', direction: 'desc' }} empty={{ title: 'No trades match' }} />
      </Card>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.product}
        subtitle={selected ? <span className="font-mono text-xs">{selected.id}</span> : null}
        footer={
          selected && decide ? (
            <>
              <Button size="sm" variant="ghost" loading={busy?.startsWith(selected.id)} onClick={() => (selected.flagged ? void act(selected, 'unflag') : ask({ title: 'Flag this trade for review?', confirmLabel: 'Flag trade', reason: 'required', onConfirm: ({ reason }) => act(selected, 'flag', reason) }))}>
                <FlagIcon className="h-4 w-4" /> {selected.flagged ? 'Remove flag' : 'Flag'}
              </Button>
              {!['cancelled', 'completed', 'refunded', 'disputed'].includes(selected.status) ? (
                <Button size="sm" onClick={() => ask({ title: 'Open a dispute?', description: 'Any paid funds are held until the dispute is resolved.', confirmLabel: 'Open dispute', tone: 'danger', reason: 'required', onConfirm: ({ reason }) => act(selected, 'dispute', reason) })}>
                  <Scale className="h-4 w-4" /> Open dispute
                </Button>
              ) : null}
              {!['cancelled', 'completed', 'refunded'].includes(selected.status) ? (
                <Button size="sm" variant="danger" onClick={() => ask({ title: 'Cancel this trade?', description: selected.paymentStatus === 'paid' ? 'The buyer has paid, so a refund request is created for finance.' : 'Both parties are notified.', confirmLabel: 'Cancel trade', tone: 'danger', reason: 'required', onConfirm: ({ reason }) => act(selected, 'cancel', reason) })}>
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {selected ? (
          <>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              <Badge>Payment: {humanize(selected.paymentStatus)}</Badge>
              <Badge>Payout: {humanize(selected.payoutStatus)}</Badge>
              {selected.refundStatus ? <Badge tone="warning">Refund {humanize(selected.refundStatus).toLowerCase()}</Badge> : null}
            </div>
            <Section title="Summary">
              <dl className="grid grid-cols-2 gap-4">
                <Detail label="Value">{money(selected.amount, selected.currency)}</Detail>
                <Detail label="In USD">{usd(selected.usd, true)}</Detail>
                <Detail label="Quantity">{selected.quantity ? num(selected.quantity) : 'Not set'}</Detail>
                <Detail label="Opened">{dateTime(selected.createdAt)}</Detail>
              </dl>
            </Section>
            <Section title="Parties">
              <div className="grid gap-3 sm:grid-cols-3">
                {(['buyer', 'seller', 'exporter'] as const).map(role => (
                  <div key={role} className="rounded-xl border border-line p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-faint">{role}</p>
                    <PersonCell person={selected[role]} />
                  </div>
                ))}
              </div>
            </Section>
            {selected.shipment ? (
              <Section title="Shipment">
                <div className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{selected.shipment.status}</span>
                    <span className="text-muted">{selected.shipment.carrier}</span>
                  </div>
                  <Meter value={selected.shipment.progress} className="mt-3" />
                </div>
              </Section>
            ) : null}
            {selected.disputeReason ? (
              <Section title="Dispute">
                <p className="rounded-xl bg-danger-soft p-3.5 text-sm text-danger">{selected.disputeReason}</p>
              </Section>
            ) : null}
          </>
        ) : null}
        {dialog}
      </Sheet>
    </>
  )
}
