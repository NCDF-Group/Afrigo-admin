'use client'
import { Bell, Send, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, useApi } from '@/lib/client/api'
import { dateTime, num } from '@/lib/format'
import { COUNTRIES, countryByIso } from '@/lib/geo/countries'
import { MEMBER_ROLES, PLATFORMS, PLATFORM_LABELS, type Platform } from '@/lib/roles'
import { useConfirm, useMutation } from '@/components/ui/action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Chip, Field, Input, Select, Textarea } from '@/components/ui/field'
import { Flag } from '@/components/ui/identity'
import { PageHeader } from '@/components/ui/page'
import { DataTable, type Column } from '@/components/ui/table'

type Audience = { roles: string[]; countries: string[]; platforms: Platform[] }
type Broadcast = { id: string; title: string; body: string; audience: Audience; recipients: number; delivered: number; failed?: number; sentBy: string; createdAt: number }

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value])

const describe = (audience: Audience) => {
  const parts = [audience.roles.length ? audience.roles.join(', ') : 'All members', audience.platforms.length && audience.platforms.length < 3 ? audience.platforms.map(item => PLATFORM_LABELS[item]).join(' and ') : null, audience.countries.length ? `${audience.countries.length} countries` : null]
  return parts.filter(Boolean).join(' · ')
}

export default function NotificationsPage() {
  const history = useApi<{ items: Broadcast[] }>('/api/notifications')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [audience, setAudience] = useState<Audience>({ roles: [], countries: [], platforms: ['web', 'ios', 'android'] })
  const [estimate, setEstimate] = useState<{ users: number; devices: number } | null>(null)
  const { run, busy } = useMutation()
  const { ask, dialog } = useConfirm()

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      api<{ users: number; devices: number }>('/api/notifications', { method: 'POST', json: { action: 'estimate', audience } })
        .then(result => active && setEstimate(result))
        .catch(() => active && setEstimate(null))
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [audience])

  const send = () =>
    ask({
      title: 'Send this notification?',
      description: `It goes to ${num(estimate?.devices ?? 0)} devices belonging to ${num(estimate?.users ?? 0)} members right away. This cannot be undone.`,
      confirmLabel: 'Send now',
      onConfirm: async () => {
        const result = await run<{ delivered: number; failed: number }>('send', '/api/notifications', { json: { title, body, link, audience } }, 'Notification sent')
        if (result) {
          setTitle('')
          setBody('')
          setLink('')
          void history.reload()
        }
        return result
      }
    })

  const columns: Column<Broadcast>[] = [
    { key: 'title', header: 'Message', cell: row => <span className="min-w-0"><span className="block truncate font-semibold">{row.title}</span><span className="block truncate text-xs text-muted">{row.body}</span></span> },
    { key: 'audience', header: 'Audience', cell: row => <span className="text-muted">{describe(row.audience)}</span>, mobile: false },
    { key: 'delivered', header: 'Delivered', align: 'right', cell: row => `${num(row.delivered)} of ${num(row.recipients)}`, sort: row => row.delivered },
    { key: 'sent', header: 'Sent', align: 'right', cell: row => <span className="text-muted">{dateTime(row.createdAt)}</span>, sort: row => row.createdAt }
  ]

  return (
    <>
      <PageHeader title="Push notifications" description="Reach members on the web, iOS and Android apps. Target by role, country and platform." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="Compose" />
          <div className="space-y-5 p-5">
            <Field label="Title">
              <Input value={title} onChange={event => setTitle(event.target.value)} maxLength={80} placeholder="New buyers are looking for cashew" />
            </Field>
            <Field label="Message" hint={`${body.length}/240`}>
              <Textarea value={body} onChange={event => setBody(event.target.value)} maxLength={240} placeholder="Tap to see fresh requests from Morocco and Egypt." />
            </Field>
            <Field label="Open link (optional)" hint="Use https:// for web pages or afrigo:// for a screen in the app">
              <Input value={link} onChange={event => setLink(event.target.value)} placeholder="afrigo://marketplace" />
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-semibold">Platforms</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(item => (
                  <Chip key={item} active={audience.platforms.includes(item)} onClick={() => setAudience({ ...audience, platforms: toggle(audience.platforms, item) })}>
                    {PLATFORM_LABELS[item]}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold">Roles</p>
              <div className="flex flex-wrap gap-2">
                <Chip active={!audience.roles.length} onClick={() => setAudience({ ...audience, roles: [] })}>
                  Everyone
                </Chip>
                {MEMBER_ROLES.map(item => (
                  <Chip key={item} active={audience.roles.includes(item)} onClick={() => setAudience({ ...audience, roles: toggle(audience.roles, item) })}>
                    {item}s
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold">Countries</p>
              <Select
                value=""
                onChange={event => event.target.value && setAudience({ ...audience, countries: toggle(audience.countries, event.target.value) })}
                aria-label="Add a country"
                className="sm:w-72"
              >
                <option value="">{audience.countries.length ? 'Add another country' : 'All countries'}</option>
                {COUNTRIES.filter(item => !audience.countries.includes(item.iso)).map(item => (
                  <option key={item.iso} value={item.iso}>
                    {item.name}
                  </option>
                ))}
              </Select>
              {audience.countries.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {audience.countries.map(iso => (
                    <button key={iso} onClick={() => setAudience({ ...audience, countries: toggle(audience.countries, iso) })} className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-subtle pl-2 pr-2.5 text-[13px] font-semibold hover:border-danger/40">
                      <Flag iso={iso} />
                      {countryByIso(iso)?.name}
                      <X className="h-3.5 w-3.5 text-faint" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-[#012A22] to-[#0B7259] p-5">
              <div className="rounded-2xl bg-white/90 p-3.5 shadow-pop backdrop-blur dark:bg-black/60">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <img src="/brand/afrigo-mark.svg" alt="" className="h-4 w-4 rounded bg-white p-0.5" />
                  Afrigo · now
                </div>
                <p className="mt-1.5 text-sm font-bold text-neutral-900 dark:text-white">{title || 'Notification title'}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-neutral-700 dark:text-neutral-300">{body || 'Your message appears here.'}</p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <Users className="h-4 w-4" /> Members
                </span>
                <span className="tabular font-semibold">{estimate ? num(estimate.users) : 'Counting'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <Bell className="h-4 w-4" /> Devices with push on
                </span>
                <span className="tabular font-semibold">{estimate ? num(estimate.devices) : 'Counting'}</span>
              </div>
              <Button variant="primary" className="w-full" loading={busy === 'send'} disabled={!title.trim() || !body.trim() || !audience.platforms.length || !estimate?.devices} onClick={send}>
                <Send className="h-4 w-4" /> Send notification
              </Button>
              <p className="text-center text-xs text-faint">Limited to 5 sends every 10 minutes.</p>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="History" action={history.data ? <Badge>{history.data.items.length}</Badge> : null} />
        <div className="mt-4 border-t border-line">
          <DataTable rows={history.data?.items ?? null} columns={columns} rowKey={row => row.id} loading={history.loading} error={history.error} onRetry={history.reload} defaultSort={{ key: 'sent', direction: 'desc' }} empty={{ title: 'No notifications sent yet' }} />
        </div>
      </Card>
      {dialog}
    </>
  )
}
