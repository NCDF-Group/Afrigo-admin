'use client'
import { ArrowRight, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { ago } from '@/lib/format'
import { Meter } from '@/components/charts/charts'
import { useMutation } from '@/components/ui/action'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip, Field, SearchInput, Select, Textarea } from '@/components/ui/field'
import { Flag, PersonCell } from '@/components/ui/identity'
import { PageHeader, Toolbar } from '@/components/ui/page'
import { Dialog } from '@/components/ui/sheet'
import { DataTable, type Column } from '@/components/ui/table'

type Person = { id: string; name: string; country: string | null } | null
type Shipment = { id: string; contractId: string; status: string; progress: number; carrier: string | null; trackingNumber: string | null; origin: string | null; destination: string | null; exporter: Person; buyer: Person; seller: Person; updatedAt: number | null }

export default function ShipmentsPage() {
  const { data, error, loading, reload } = useApi<{ items: Shipment[]; milestones: string[] }>('/api/shipments')
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')
  const [editing, setEditing] = useState<Shipment | null>(null)
  const [milestone, setMilestone] = useState('')
  const [reason, setReason] = useState('')
  const { can } = useSession()
  const { run, busy } = useMutation()

  const rows = useMemo(() => {
    if (!data) return null
    const term = query.trim().toLowerCase()
    return data.items.filter(item => (stage === 'all' || (stage === 'moving' ? item.progress < 100 : item.status === stage)) && (!term || `${item.trackingNumber ?? ''} ${item.carrier ?? ''} ${item.exporter?.name ?? ''} ${item.id}`.toLowerCase().includes(term)))
  }, [data, query, stage])

  const editable = (row: Shipment) => can('disputes:decide') && row.progress < 100

  const openEditor = (row: Shipment) => {
    if (!editable(row)) return
    setEditing(row)
    setMilestone(row.status)
    setReason('')
  }

  const save = async () => {
    if (!editing) return
    const result = await run('override', '/api/shipments', { json: { id: editing.id, status: milestone, reason } }, `Shipment moved to ${milestone}`)
    if (result) {
      setEditing(null)
      void reload()
    }
  }

  const columns: Column<Shipment>[] = [
    {
      key: 'route',
      header: 'Route',
      cell: row => (
        <span className="flex items-center gap-2">
          <Flag iso={row.origin} />
          <ArrowRight className="h-3.5 w-3.5 text-faint" />
          <Flag iso={row.destination} />
          <span className="ml-1 min-w-0">
            <span className="block truncate font-mono text-[12px] font-semibold">{row.trackingNumber ?? row.id.slice(0, 10)}</span>
            <span className="block text-xs text-muted">{row.carrier ?? 'Carrier not set'}</span>
          </span>
        </span>
      )
    },
    { key: 'exporter', header: 'Exporter', cell: row => <PersonCell person={row.exporter} /> },
    {
      key: 'progress',
      header: 'Progress',
      sort: row => row.progress,
      cell: row => (
        <span className="block w-40 max-w-full">
          <span className="mb-1.5 flex items-center justify-between text-xs">
            <StatusBadge status={row.status} />
            <span className="tabular text-faint">{row.progress}%</span>
          </span>
          <Meter value={row.progress} />
        </span>
      )
    },
    { key: 'updated', header: 'Updated', align: 'right', cell: row => <span className="text-muted">{ago(row.updatedAt)}</span>, sort: row => row.updatedAt ?? 0 },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobile: false,
      cell: row =>
        editable(row) ? (
          <Button size="sm" variant="ghost" onClick={() => openEditor(row)}>
            <Pencil className="h-3.5 w-3.5" /> Override
          </Button>
        ) : null
    }
  ]

  return (
    <>
      <PageHeader title="Shipments" description="Track goods in motion across African corridors. Exporters update milestones from the mobile app; operations can correct them here." />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Tracking number, carrier or exporter" className="sm:w-72" />
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {['all', 'moving', ...(data?.milestones ?? [])].map(item => (
              <Chip key={item} active={stage === item} onClick={() => setStage(item)}>
                {item === 'all' ? 'All' : item === 'moving' ? 'In motion' : item}
              </Chip>
            ))}
          </div>
        </Toolbar>
        <DataTable rows={rows} columns={columns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} onRowClick={openEditor} defaultSort={{ key: 'updated', direction: 'desc' }} empty={{ title: 'No shipments match' }} />
      </Card>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Override milestone"
        description="Use this when an exporter cannot update the app. Buyers and sellers see the new status immediately."
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" loading={busy === 'override'} disabled={!reason.trim() || milestone === editing?.status} onClick={() => void save()}>
              Save milestone
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Milestone">
            <Select value={milestone} onChange={event => setMilestone(event.target.value)}>
              {data?.milestones.map(item => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
          <Field label="Reason">
            <Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="For example: carrier confirmed pickup by phone" />
          </Field>
        </div>
      </Dialog>
    </>
  )
}
