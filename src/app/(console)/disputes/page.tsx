'use client'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { cn } from '@/lib/cn'
import { ago, dateTime, humanize, money, usd } from '@/lib/format'
import { useMutation } from '@/components/ui/action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Textarea } from '@/components/ui/field'
import { PersonCell } from '@/components/ui/identity'
import { Detail, PageHeader, Section, Toolbar } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { DataTable, type Column } from '@/components/ui/table'

type Person = { id: string; name: string; country: string | null } | null
type Dispute = { id: string; caseId: string | null; product: string; amount: number; currency: string; usd: number; paid: boolean; reason: string; openedBy: Person; buyer: Person; seller: Person; createdAt: number | null }
type SupportCase = { id: string; category: string; summary: string; openedBy: Person; createdAt: number | null; updatedAt: number | null }
type Note = { id: string; body: string; authorEmail: string; createdAt: number }

const DECISIONS = [
  { value: 'buyer', label: 'Rule for buyer', hint: 'A refund request goes to finance.' },
  { value: 'seller', label: 'Rule for seller', hint: 'Funds are released and the trade continues.' },
  { value: 'cancel', label: 'Cancel trade', hint: 'The trade ends. Paid funds are refunded.' }
]

function Notes({ caseId }: { caseId: string }) {
  const { data, reload } = useApi<{ notes: Note[] }>(`/api/cases/${caseId}`)
  const { can } = useSession()
  const { run, busy } = useMutation()
  const [note, setNote] = useState('')
  const send = async () => {
    if (await run('note', '/api/cases', { json: { action: 'note', caseId, note } }, 'Note added')) {
      setNote('')
      void reload()
    }
  }
  return (
    <Section title="Internal notes">
      <ul className="space-y-3">
        {data?.notes.map(item => (
          <li key={item.id} className="rounded-xl bg-subtle p-3">
            <p className="whitespace-pre-wrap text-sm">{item.body}</p>
            <p className="mt-1.5 text-xs text-muted">
              {item.authorEmail} · {dateTime(item.createdAt)}
            </p>
          </li>
        ))}
        {data && !data.notes.length ? <li className="text-sm text-muted">No notes yet.</li> : null}
      </ul>
      {can('cases:communicate') ? (
        <div className="mt-3 flex items-end gap-2">
          <Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Add a note for the team" className="min-h-[44px]" rows={2} />
          <Button variant="primary" size="icon" aria-label="Add note" loading={busy === 'note'} disabled={!note.trim()} onClick={() => void send()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </Section>
  )
}

export default function DisputesPage() {
  const { data, error, loading, reload } = useApi<{ disputes: Dispute[]; cases: SupportCase[] }>('/api/cases')
  const [tab, setTab] = useState<'disputes' | 'cases'>('disputes')
  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [support, setSupport] = useState<SupportCase | null>(null)
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const { can } = useSession()
  const { run, busy } = useMutation()

  const openDispute = (row: Dispute) => {
    setDispute(row)
    setDecision('')
    setReason('')
  }

  const openCase = (row: SupportCase) => {
    setSupport(row)
    setReason('')
  }

  const resolve = async () => {
    if (!dispute) return
    if (await run('resolve', '/api/cases', { json: { action: 'resolve-dispute', contractId: dispute.id, decision, reason } }, 'Dispute resolved')) {
      setDispute(null)
      void reload()
    }
  }

  const close = async () => {
    if (!support) return
    if (await run('close', '/api/cases', { json: { action: 'close', caseId: support.id, reason } }, 'Case closed')) {
      setSupport(null)
      void reload()
    }
  }

  const disputeColumns: Column<Dispute>[] = [
    { key: 'product', header: 'Trade', cell: row => <span className="min-w-0"><span className="block truncate font-semibold">{row.product}</span><span className="block truncate text-xs text-muted">{row.reason}</span></span> },
    { key: 'buyer', header: 'Buyer', cell: row => <PersonCell person={row.buyer} /> },
    { key: 'seller', header: 'Seller', cell: row => <PersonCell person={row.seller} />, mobile: false },
    { key: 'held', header: 'At stake', align: 'right', cell: row => <span className="font-semibold">{usd(row.usd)}</span>, sort: row => row.usd },
    { key: 'age', header: 'Open for', align: 'right', cell: row => <span className="text-muted">{ago(row.createdAt)}</span>, sort: row => row.createdAt ?? 0 }
  ]

  const caseColumns: Column<SupportCase>[] = [
    { key: 'summary', header: 'Case', cell: row => <span className="min-w-0"><span className="block truncate font-semibold">{row.summary}</span><Badge className="mt-1">{humanize(row.category)}</Badge></span> },
    { key: 'member', header: 'Member', cell: row => <PersonCell person={row.openedBy} /> },
    { key: 'age', header: 'Opened', align: 'right', cell: row => <span className="text-muted">{ago(row.createdAt)}</span>, sort: row => row.createdAt ?? 0 }
  ]

  return (
    <>
      <PageHeader title="Disputes & support" description="Resolve trade disputes fairly and keep member support moving. Every decision is recorded." />
      <Card className="overflow-hidden">
        <Toolbar>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'disputes', label: 'Trade disputes', count: data?.disputes.length },
              { value: 'cases', label: 'Support cases', count: data?.cases.length }
            ]}
          />
        </Toolbar>
        {tab === 'disputes' ? (
          <DataTable rows={data?.disputes ?? null} columns={disputeColumns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} onRowClick={openDispute} defaultSort={{ key: 'age', direction: 'asc' }} empty={{ title: 'No open disputes', description: 'Nice. Every trade is on track.' }} />
        ) : (
          <DataTable rows={data?.cases ?? null} columns={caseColumns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} onRowClick={openCase} defaultSort={{ key: 'age', direction: 'asc' }} empty={{ title: 'No open support cases' }} />
        )}
      </Card>

      <Sheet
        open={Boolean(dispute)}
        onClose={() => setDispute(null)}
        title={dispute?.product}
        subtitle="Trade dispute"
        footer={
          dispute && can('disputes:decide') ? (
            <Button variant="primary" loading={busy === 'resolve'} disabled={!decision || !reason.trim()} onClick={() => void resolve()}>
              Record decision
            </Button>
          ) : null
        }
      >
        {dispute ? (
          <>
            <p className="rounded-xl bg-danger-soft p-3.5 text-sm text-danger">{dispute.reason || 'No reason given'}</p>
            <Section title="Details">
              <dl className="grid grid-cols-2 gap-4">
                <Detail label="Value">{money(dispute.amount, dispute.currency)}</Detail>
                <Detail label="Payment">{dispute.paid ? 'Paid and held' : 'Not paid'}</Detail>
                <Detail label="Buyer">
                  <PersonCell person={dispute.buyer} />
                </Detail>
                <Detail label="Seller">
                  <PersonCell person={dispute.seller} />
                </Detail>
              </dl>
            </Section>
            {dispute.caseId ? <Notes caseId={dispute.caseId} /> : null}
            {can('disputes:decide') ? (
              <Section title="Decision">
                <div className="grid gap-2">
                  {DECISIONS.map(item => (
                    <button key={item.value} type="button" onClick={() => setDecision(item.value)} className={cn('rounded-xl border p-3.5 text-left transition-colors', decision === item.value ? 'border-primary bg-primary-soft' : 'border-line hover:bg-subtle')}>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-muted">{item.hint}</span>
                    </button>
                  ))}
                </div>
                <Field label="Reasoning" className="mt-4">
                  <Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Shared with both parties" />
                </Field>
              </Section>
            ) : null}
          </>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(support)}
        onClose={() => setSupport(null)}
        title={support?.summary}
        subtitle={support ? humanize(support.category) : null}
        footer={
          support && can('cases:communicate') ? (
            <Button variant="primary" loading={busy === 'close'} disabled={!reason.trim()} onClick={() => void close()}>
              Close case
            </Button>
          ) : null
        }
      >
        {support ? (
          <>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="Member">
                <PersonCell person={support.openedBy} />
              </Detail>
              <Detail label="Opened">{dateTime(support.createdAt)}</Detail>
            </dl>
            <Notes caseId={support.id} />
            {can('cases:communicate') ? (
              <Section title="Resolution">
                <Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="What fixed it?" />
              </Section>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </>
  )
}
