'use client'
import { Banknote, Check, CircleDollarSign, Hand, Landmark, Lock, PauseCircle, PlayCircle, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { ago, humanize, money, usd } from '@/lib/format'
import { Kpi, KpiSkeleton } from '@/components/dashboard/widgets'
import { useConfirm, useMutation } from '@/components/ui/action'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PersonCell } from '@/components/ui/identity'
import { PageHeader, Toolbar } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { DataTable, type Column } from '@/components/ui/table'

type Person = { id: string; name: string; country: string | null } | null
type Payout = { id: string; contractId: string; amount: number; currency: string; usd: number; status: string; requiresTwoApprovals: boolean; approvals: number; riskReasons: string[]; account: string | null; seller: Person; createdAt: number | null }
type Refund = { id: string; product: string; amount: number; currency: string; usd: number; reason: string; buyer: Person; seller: Person; createdAt: number | null }
type Finance = { summary: Record<'settled' | 'escrow' | 'held' | 'paidOut' | 'pendingPayouts' | 'pendingRefunds', number>; payouts: Payout[]; refunds: Refund[] }

export default function FinancePage() {
  const { data, error, loading, reload } = useApi<Finance>('/api/finance')
  const [tab, setTab] = useState<'payouts' | 'refunds'>('payouts')
  const { can } = useSession()
  const { run, busy } = useMutation()
  const { ask, dialog } = useConfirm()

  const act = async (key: string, json: Record<string, unknown>, message: string) => {
    const result = await run(key, '/api/finance', { json }, message)
    if (result) void reload()
    return result
  }

  const payoutActions = (row: Payout) => {
    if (!can('payouts:execute')) return null
    return (
      <span className="flex flex-wrap justify-end gap-1">
        {row.status === 'held' ? (
          <Button size="sm" variant="ghost" loading={busy === `${row.id}:release`} onClick={() => void act(`${row.id}:release`, { action: 'release', requestId: row.id }, 'Payout released for approval')}>
            <PlayCircle className="h-4 w-4" /> Release
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => ask({ title: 'Hold this payout?', description: 'The seller is not paid until the hold is released.', confirmLabel: 'Hold payout', tone: 'danger', reason: 'required', onConfirm: ({ reason }) => act(`${row.id}:hold`, { action: 'hold', requestId: row.id, reason }, 'Payout on hold') })}>
            <PauseCircle className="h-4 w-4" /> Hold
          </Button>
        )}
        {['pending_approval', 'partially_approved'].includes(row.status) ? (
          <Button size="sm" variant="success" loading={busy === `${row.id}:approve`} onClick={() => void act(`${row.id}:approve`, { action: 'approve', requestId: row.id }, 'Approval recorded')}>
            <Check className="h-4 w-4" /> Approve
          </Button>
        ) : null}
        {row.status === 'approved' ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              ask({
                title: 'Mark as paid',
                description: `Confirm ${money(row.amount, row.currency)} reached ${row.seller?.name ?? 'the seller'}. Enter the bank or provider reference.`,
                confirmLabel: 'Mark paid',
                tone: 'success',
                input: { label: 'Transfer reference', placeholder: 'e.g. TRF-2026-00481' },
                onConfirm: ({ input }) => act(`${row.id}:paid`, { action: 'mark-paid', requestId: row.id, reference: input }, 'Payout marked as paid')
              })
            }
          >
            <Banknote className="h-4 w-4" /> Mark paid
          </Button>
        ) : null}
      </span>
    )
  }

  const payoutColumns: Column<Payout>[] = [
    { key: 'seller', header: 'Seller', cell: row => <PersonCell person={row.seller} sub={<span className="font-mono text-xs text-muted">{row.account ?? 'No account'}</span>} /> },
    { key: 'amount', header: 'Amount', align: 'right', cell: row => <span><span className="block font-semibold">{money(row.amount, row.currency)}</span>{row.currency !== 'USD' ? <span className="text-xs text-faint">{usd(row.usd)}</span> : null}</span>, sort: row => row.usd },
    {
      key: 'status',
      header: 'Status',
      cell: row => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={row.status} />
          {row.requiresTwoApprovals ? <Badge tone="info"><Lock className="h-3 w-3" /> {row.approvals}/2</Badge> : null}
          {row.riskReasons.map(reason => (
            <Badge key={reason} tone="danger">{humanize(reason)}</Badge>
          ))}
        </span>
      )
    },
    { key: 'age', header: 'Requested', align: 'right', cell: row => <span className="text-muted">{ago(row.createdAt)}</span>, sort: row => row.createdAt ?? 0, mobile: false },
    { key: 'actions', header: '', align: 'right', cell: payoutActions }
  ]

  const refundColumns: Column<Refund>[] = [
    { key: 'product', header: 'Trade', cell: row => <span className="min-w-0"><span className="block truncate font-semibold">{row.product}</span><span className="block truncate text-xs text-muted">{row.reason}</span></span> },
    { key: 'buyer', header: 'Buyer', cell: row => <PersonCell person={row.buyer} /> },
    { key: 'amount', header: 'Amount', align: 'right', cell: row => <span className="font-semibold">{money(row.amount, row.currency)}</span>, sort: row => row.usd },
    { key: 'age', header: 'Requested', align: 'right', cell: row => <span className="text-muted">{ago(row.createdAt)}</span>, sort: row => row.createdAt ?? 0, mobile: false },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: row =>
        can('refunds:execute') ? (
          <span className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => ask({ title: 'Reject refund?', confirmLabel: 'Reject', tone: 'danger', reason: 'required', onConfirm: ({ reason }) => act(`${row.id}:reject`, { action: 'refund-reject', contractId: row.id, reason }, 'Refund rejected') })}>
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button size="sm" variant="success" onClick={() => ask({ title: 'Approve refund?', description: `${money(row.amount, row.currency)} is returned to ${row.buyer?.name ?? 'the buyer'} through the payment provider.`, confirmLabel: 'Approve refund', tone: 'success', reason: 'optional', onConfirm: ({ reason }) => act(`${row.id}:approve`, { action: 'refund-approve', contractId: row.id, reason }, 'Refund is processing') })}>
              <Undo2 className="h-4 w-4" /> Approve
            </Button>
          </span>
        ) : null
    }
  ]

  const summary = data?.summary

  return (
    <>
      <PageHeader title="Finance" description="Settlement, escrow and payouts. Large or risky payouts need two different operators to approve." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summary ? (
          <>
            <Kpi label="Settled value" value={usd(summary.settled)} icon={CircleDollarSign} hint="All paid trades" />
            <Kpi label="In escrow" value={usd(summary.escrow)} icon={Landmark} hint="Paid, awaiting delivery" />
            <Kpi label="Held in disputes" value={usd(summary.held)} icon={Hand} hint="Frozen until resolved" />
            <Kpi label="Paid out" value={usd(summary.paidOut)} icon={Banknote} hint={`${usd(summary.pendingPayouts)} waiting`} />
          </>
        ) : (
          Array.from({ length: 4 }, (_, index) => <KpiSkeleton key={index} />)
        )}
      </div>
      <Card className="mt-4 overflow-hidden">
        <Toolbar>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'payouts', label: 'Payout requests', count: data?.payouts.length },
              { value: 'refunds', label: 'Refund requests', count: data?.refunds.length }
            ]}
          />
        </Toolbar>
        {tab === 'payouts' ? (
          <DataTable rows={data?.payouts ?? null} columns={payoutColumns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'age', direction: 'asc' }} empty={{ title: 'No payouts waiting' }} />
        ) : (
          <DataTable rows={data?.refunds ?? null} columns={refundColumns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'age', direction: 'asc' }} empty={{ title: 'No refunds waiting' }} />
        )}
      </Card>
      {dialog}
    </>
  )
}
