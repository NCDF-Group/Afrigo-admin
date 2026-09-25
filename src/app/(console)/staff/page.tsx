'use client'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { dateTime, date } from '@/lib/format'
import { CAPABILITIES, ROLE_LABELS, STAFF_ROLES, type StaffRole } from '@/lib/roles'
import { useConfirm, useMutation } from '@/components/ui/action'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { Avatar } from '@/components/ui/identity'
import { PageHeader } from '@/components/ui/page'
import { DataTable, type Column } from '@/components/ui/table'

type Member = { id: string; email: string; name: string; role: StaffRole; status: string; assignedAt: number | null }
type Change = { id: string; targetEmail: string; previousRole: string | null; newRole: string | null; assignedByEmail: string; createdAt: number }

const label = (role: string | null) => (role ? ROLE_LABELS[role as StaffRole] ?? role : 'No access')

export default function StaffPage() {
  const { data, error, loading, reload } = useApi<{ staff: Member[]; history: Change[] }>('/api/staff')
  const { staff: me } = useSession()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('support_agent')
  const { run, busy } = useMutation()
  const { ask, dialog } = useConfirm()

  const assign = async (target: string, next: StaffRole | null) => {
    const result = await run<{ message: string }>(`assign:${target}`, '/api/staff', { json: { email: target, role: next } }, next ? 'Access updated' : 'Access revoked')
    if (result) {
      setEmail('')
      void reload()
    }
    return result
  }

  const columns: Column<Member>[] = [
    { key: 'name', header: 'Person', sort: row => row.name, cell: row => <span className="flex min-w-0 items-center gap-3"><Avatar name={row.name} /><span className="min-w-0"><span className="block truncate font-semibold">{row.name}</span><span className="block truncate text-xs text-muted">{row.email}</span></span></span> },
    {
      key: 'role',
      header: 'Role',
      sort: row => row.role,
      cell: row =>
        row.email === me?.email ? (
          <Badge tone="brand">{label(row.role)}</Badge>
        ) : (
          <Select value={row.role} onChange={event => void assign(row.email, event.target.value as StaffRole)} aria-label={`Role for ${row.name}`} className="w-48">
            {STAFF_ROLES.map(item => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </Select>
        )
    },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'since', header: 'Since', align: 'right', cell: row => <span className="text-muted">{date(row.assignedAt)}</span>, sort: row => row.assignedAt ?? 0 },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: row =>
        row.email !== me?.email && row.status === 'active' ? (
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => ask({ title: `Revoke access for ${row.name}?`, description: 'They are signed out immediately and lose access to this console.', confirmLabel: 'Revoke access', tone: 'danger', onConfirm: () => assign(row.email, null) })}>
            Revoke
          </Button>
        ) : null
    }
  ]

  return (
    <>
      <PageHeader title="Staff & access" description="Grant operational roles to Afrigo team members. Every change signs the person out so new permissions apply immediately." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader title="Team" description={data ? `${data.staff.filter(item => item.status === 'active').length} people with access` : undefined} />
          <div className="mt-4 border-t border-line">
            <DataTable rows={data?.staff ?? null} columns={columns} rowKey={row => row.id} loading={loading} error={error} onRetry={reload} defaultSort={{ key: 'since', direction: 'desc' }} empty={{ title: 'No staff yet' }} />
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Add a team member" description="They need a verified Afrigo account first." />
            <form
              className="space-y-4 p-5"
              onSubmit={event => {
                event.preventDefault()
                void assign(email.trim(), role)
              }}
            >
              <Field label="Email">
                <Input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@afrigo.africa" />
              </Field>
              <Field label="Role">
                <Select value={role} onChange={event => setRole(event.target.value as StaffRole)}>
                  {STAFF_ROLES.map(item => (
                    <option key={item} value={item}>
                      {ROLE_LABELS[item]}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="rounded-xl bg-subtle p-3 text-xs leading-relaxed text-muted">Can: {CAPABILITIES[role].includes('*') ? 'everything, including managing staff' : CAPABILITIES[role].join(', ').replace(/:/g, ' ')}</p>
              <Button type="submit" variant="primary" className="w-full" loading={busy === `assign:${email.trim()}`} disabled={!email.trim()}>
                <UserPlus className="h-4 w-4" /> Grant access
              </Button>
            </form>
          </Card>
          <Card>
            <CardHeader title="Recent changes" />
            <ul className="space-y-3 p-5">
              {data?.history.slice(0, 8).map(item => (
                <li key={item.id} className="text-[13px]">
                  <p>
                    <span className="font-semibold">{item.targetEmail}</span> {label(item.previousRole)} to <span className="font-semibold">{label(item.newRole)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {item.assignedByEmail} · {dateTime(item.createdAt)}
                  </p>
                </li>
              ))}
              {data && !data.history.length ? <li className="text-sm text-muted">No changes recorded yet.</li> : null}
            </ul>
          </Card>
        </div>
      </div>
      {dialog}
    </>
  )
}
