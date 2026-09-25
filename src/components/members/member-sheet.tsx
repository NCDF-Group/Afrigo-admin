'use client'
import { BadgeCheck, Ban, LogOut, RotateCcw, ShieldX } from 'lucide-react'
import { useApi } from '@/lib/client/api'
import { useSession } from '@/lib/client/session'
import { ago, date, dateTime, humanize, money } from '@/lib/format'
import { MEMBER_ROLES, PLATFORM_LABELS } from '@/lib/roles'
import { useConfirm, useMutation } from '@/components/ui/action'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { Avatar, CountryName } from '@/components/ui/identity'
import { Detail, Section } from '@/components/ui/page'
import { Sheet } from '@/components/ui/sheet'
import { Empty, ErrorState, Rows } from '@/components/ui/states'
import { resolveCountry } from '@/lib/geo/countries'

export type Member = {
  id: string
  name: string
  email: string
  role: string
  country: string | null
  company: string | null
  kycStatus: string
  status: string
  platform: string
  appVersion: string | null
  lastActiveAt: number | null
  createdAt: number | null
}

type MemberDetail = {
  user: Record<string, any>
  company: Record<string, any> | null
  documents: Record<string, any>[]
  contracts: Record<string, any>[]
  activity: Record<string, any>[]
}

export function MemberSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { data, error, loading, reload } = useApi<MemberDetail>(id ? `/api/users/${id}` : null)
  const { can } = useSession()
  const { run, busy } = useMutation()
  const { ask, dialog } = useConfirm()
  const user = data?.user
  const current = data && user?.id === id ? data : null

  const act = (action: string, extra: Record<string, unknown> = {}, message = 'Saved') =>
    run(action, `/api/users/${id}`, { json: { action, ...extra } }, message).then(result => {
      if (result) {
        void reload()
        onChanged()
      }
      return result
    })

  const manage = can('users:manage')

  return (
    <Sheet
      open={Boolean(id)}
      onClose={onClose}
      wide
      title={current ? current.user.displayName || current.user.email : 'Member'}
      subtitle={current ? current.user.email : undefined}
      footer={
        current && manage ? (
          <>
            <Button size="sm" variant="ghost" loading={busy === 'revoke'} onClick={() => act('revoke', {}, 'All sessions signed out')}>
              <LogOut className="h-4 w-4" /> Sign out everywhere
            </Button>
            {current.user.status === 'suspended' ? (
              <Button size="sm" loading={busy === 'reactivate'} onClick={() => act('reactivate', {}, 'Account reactivated')}>
                <RotateCcw className="h-4 w-4" /> Reactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  ask({
                    title: 'Suspend this account?',
                    description: 'They will be signed out of web and mobile immediately and cannot sign back in until reactivated.',
                    confirmLabel: 'Suspend account',
                    tone: 'danger',
                    reason: 'required',
                    onConfirm: ({ reason }) => act('suspend', { reason }, 'Account suspended')
                  })
                }
              >
                <Ban className="h-4 w-4" /> Suspend
              </Button>
            )}
            {current.user.kycStatus !== 'verified' ? (
              <Button size="sm" variant="success" loading={busy === 'verify'} onClick={() => act('verify', {}, 'Business verified')}>
                <BadgeCheck className="h-4 w-4" /> Verify business
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() =>
                  ask({ title: 'Revoke verification?', description: 'The business loses its verified badge and must resubmit documents.', confirmLabel: 'Revoke', tone: 'danger', reason: 'required', onConfirm: ({ reason }) => act('reject', { reason }, 'Verification revoked') })
                }
              >
                <ShieldX className="h-4 w-4" /> Revoke verification
              </Button>
            )}
          </>
        ) : null
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !current ? (
        <Rows count={5} />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Avatar name={current.user.displayName || current.user.email} className="h-14 w-14 text-base" />
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{current.user.role}</Badge>
              <StatusBadge status={current.user.kycStatus || 'not_started'} />
              <StatusBadge status={current.user.status || 'active'} />
            </div>
          </div>

          <Section title="Profile">
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="Country">
                <CountryName iso={resolveCountry(current.user.country) ?? resolveCountry(current.company?.country)} />
              </Detail>
              <Detail label="Company">{current.company?.name ?? 'Not provided'}</Detail>
              <Detail label="App">
                {PLATFORM_LABELS[current.user.platform as keyof typeof PLATFORM_LABELS] ?? 'Web'}
                {current.user.appVersion ? ` ${current.user.appVersion}` : ''}
              </Detail>
              <Detail label="Push notifications">{current.user.pushEnabled ? 'Enabled' : 'Off'}</Detail>
              <Detail label="Joined">{date(current.user.createdAt)}</Detail>
              <Detail label="Last seen">{ago(current.user.lastActiveAt)}</Detail>
              <Detail label="Payout account">{current.user.settlement ? `${current.user.settlement.bankCode} •••• ${current.user.settlement.accountLast4}` : 'Not set up'}</Detail>
              {current.user.statusReason ? <Detail label="Status note">{current.user.statusReason}</Detail> : null}
            </dl>
          </Section>

          {manage ? (
            <Section title="Trade role">
              <Select value={current.user.role} onChange={event => void act('role', { role: event.target.value }, `Role changed to ${event.target.value}`)} disabled={busy === 'role'} aria-label="Trade role" className="sm:w-56">
                {MEMBER_ROLES.map(role => (
                  <option key={role}>{role}</option>
                ))}
              </Select>
            </Section>
          ) : null}

          <Section title={`Documents (${current.documents.length})`}>
            {current.documents.length ? (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {current.documents.map(document => (
                  <li key={document.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="truncate">{document.meta?.name ?? humanize(document.type)}</span>
                    <StatusBadge status={document.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No documents uploaded.</p>
            )}
          </Section>

          <Section title={`Trades (${current.contracts.length})`}>
            {current.contracts.length ? (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {current.contracts.slice(0, 8).map(contract => (
                  <li key={contract.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{contract.productTitle ?? 'Trade'}</span>
                      <span className="text-xs text-muted">
                        {contract.buyerId === current.user.id ? 'Buying' : 'Selling'} · {money(Number(contract.amount || 0), contract.currency || 'USD')}
                      </span>
                    </span>
                    <StatusBadge status={contract.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No trades yet.</p>
            )}
          </Section>

          <Section title="Recent activity">
            {current.activity.length ? (
              <ol className="relative space-y-4 border-l border-line pl-5">
                {current.activity.map(item => (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-accent ring-4 ring-surface" />
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted">{dateTime(item.createdAt)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="No recorded activity" className="py-6" />
            )}
          </Section>
        </>
      )}
      {dialog}
    </Sheet>
  )
}
