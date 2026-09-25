'use client'
import { Check, ExternalLink, FileText, X } from 'lucide-react'
import { useState } from 'react'
import { api, useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { ago, bytes } from '@/lib/format'
import { resolveCountry } from '@/lib/geo/countries'
import { useConfirm, useMutation } from '@/components/ui/action'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CountryName, PersonCell } from '@/components/ui/identity'
import { PageHeader, Toolbar } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { useToast } from '@/components/ui/toast'
import { DataTable, type Column } from '@/components/ui/table'

type Person = { id: string; name: string; country: string | null } | null
type DocumentRow = { id: string; type: string; name: string; size: number; mimeType: string; owner: Person; createdAt: number }
type CompanyRow = { id: string; name: string; country: string; owner: Person; createdAt: number }
type ComplianceRow = { id: string; category: string; requirement: string; dueDate: string | null; owner: Person; createdAt: number }
type Queue = { documents: DocumentRow[]; companies: CompanyRow[]; compliance: ComplianceRow[] }
type Kind = 'document' | 'company' | 'compliance'

export default function VerificationPage() {
  const { data, error, loading, reload, setData } = useApi<Queue>('/api/verification')
  const [tab, setTab] = useState<Kind>('document')
  const { can } = useSession()
  const { run, busy } = useMutation()
  const { ask, dialog } = useConfirm()
  const toast = useToast()
  const review = can('compliance:review')

  const decide = async (kind: Kind, id: string, decision: 'approve' | 'reject', reason = '') => {
    const result = await run(`${id}:${decision}`, '/api/verification', { json: { kind, id, decision, reason } }, decision === 'approve' ? 'Approved' : 'Rejected')
    if (result && data) {
      const key = kind === 'document' ? 'documents' : kind === 'company' ? 'companies' : 'compliance'
      setData({ ...data, [key]: (data[key] as { id: string }[]).filter(item => item.id !== id) } as Queue)
    }
    return result
  }

  const actions = (kind: Kind, id: string) =>
    review ? (
      <span className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => ask({ title: 'Reject this submission?', description: 'The member sees your reason and can resubmit.', confirmLabel: 'Reject', tone: 'danger', reason: 'required', onConfirm: ({ reason }) => decide(kind, id, 'reject', reason) })}>
          <X className="h-4 w-4" /> Reject
        </Button>
        <Button size="sm" variant="success" loading={busy === `${id}:approve`} onClick={() => void decide(kind, id, 'approve')}>
          <Check className="h-4 w-4" /> Approve
        </Button>
      </span>
    ) : null

  const view = async (id: string) => {
    try {
      const { url } = await api<{ url: string }>(`/api/documents/${id}`)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Could not open document', 'error')
    }
  }

  const documentColumns: Column<DocumentRow>[] = [
    {
      key: 'name',
      header: 'Document',
      sort: row => row.name,
      cell: row => (
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-subtle text-muted">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <button onClick={() => void view(row.id)} className="flex items-center gap-1 truncate font-semibold hover:underline">
              {row.name} <ExternalLink className="h-3 w-3 text-faint" />
            </button>
            <span className="text-xs text-muted">{bytes(row.size)}</span>
          </span>
        </span>
      )
    },
    { key: 'owner', header: 'Submitted by', cell: row => <PersonCell person={row.owner} /> },
    { key: 'waiting', header: 'Waiting', cell: row => <span className="text-muted">{ago(row.createdAt)}</span>, sort: row => row.createdAt },
    { key: 'actions', header: '', align: 'right', cell: row => actions('document', row.id), mobile: true }
  ]

  const companyColumns: Column<CompanyRow>[] = [
    { key: 'name', header: 'Business', cell: row => <span className="font-semibold">{row.name}</span>, sort: row => row.name },
    { key: 'country', header: 'Country', cell: row => <CountryName iso={resolveCountry(row.country)} /> },
    { key: 'owner', header: 'Owner', cell: row => <PersonCell person={row.owner} sub={null} /> },
    { key: 'waiting', header: 'Waiting', cell: row => <span className="text-muted">{ago(row.createdAt)}</span>, sort: row => row.createdAt },
    { key: 'actions', header: '', align: 'right', cell: row => actions('company', row.id) }
  ]

  const complianceColumns: Column<ComplianceRow>[] = [
    { key: 'category', header: 'Requirement', cell: row => <span className="min-w-0"><span className="block font-semibold">{row.category}</span><span className="block truncate text-xs text-muted">{row.requirement}</span></span>, sort: row => row.category },
    { key: 'owner', header: 'Exporter', cell: row => <PersonCell person={row.owner} /> },
    { key: 'due', header: 'Due', cell: row => <span className="text-muted">{row.dueDate ?? 'No date'}</span>, sort: row => row.dueDate ?? '' },
    { key: 'actions', header: '', align: 'right', cell: row => actions('compliance', row.id) }
  ]

  const table = {
    document: <DataTable rows={data?.documents ?? null} columns={documentColumns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'waiting', direction: 'asc' }} empty={{ title: 'All documents reviewed', description: 'New KYC uploads from the web and mobile apps land here.' }} />,
    company: <DataTable rows={data?.companies ?? null} columns={companyColumns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'waiting', direction: 'asc' }} empty={{ title: 'No businesses waiting' }} />,
    compliance: <DataTable rows={data?.compliance ?? null} columns={complianceColumns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} empty={{ title: 'No compliance checks pending' }} />
  }[tab]

  return (
    <>
      <PageHeader title="Verification" description="Review KYC documents, verify businesses, and clear export compliance before goods move." />
      <Card className="overflow-hidden">
        <Toolbar>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'document', label: 'Documents', count: data?.documents.length },
              { value: 'company', label: 'Businesses', count: data?.companies.length },
              { value: 'compliance', label: 'Compliance', count: data?.compliance.length }
            ]}
          />
        </Toolbar>
        {table}
      </Card>
      {dialog}
    </>
  )
}
