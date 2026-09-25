'use client'
import { CheckCheck, Mail, Reply } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/client/api'
import { cn } from '@/lib/cn'
import { ago, dateTime, humanize } from '@/lib/format'
import { resolveCountry } from '@/lib/geo/countries'
import { useMutation } from '@/components/ui/action'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/field'
import { Avatar, CountryName } from '@/components/ui/identity'
import { Detail, PageHeader, Toolbar } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { Empty, ErrorState, Rows } from '@/components/ui/states'

type Message = { id: string; name: string; email: string; company: string; country: string; topic: string; message: string; status: string; createdAt: number }
type Filter = 'new' | 'in_progress' | 'resolved' | 'all'

export default function InboxPage() {
  const { data, error, loading, reload, setData } = useApi<{ items: Message[] }>('/api/inbox')
  const [filter, setFilter] = useState<Filter>('new')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const { run, busy } = useMutation()

  const items = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (data?.items ?? []).filter(item => (filter === 'all' || item.status === filter) && (!term || `${item.name} ${item.email} ${item.company} ${item.message}`.toLowerCase().includes(term)))
  }, [data, filter, query])

  const open = items.find(item => item.id === openId) ?? items[0] ?? null
  const count = (status: Filter) => data?.items.filter(item => status === 'all' || item.status === status).length

  const setStatus = async (item: Message, status: string) => {
    const result = await run(`${item.id}:${status}`, '/api/inbox', { json: { id: item.id, status } }, `Marked ${humanize(status).toLowerCase()}`)
    if (result && data) setData({ items: data.items.map(entry => (entry.id === item.id ? { ...entry, status } : entry)) })
  }

  return (
    <>
      <PageHeader title="Inbox" description="Enquiries sent through the contact form on the Afrigo website." />
      <Card className="overflow-hidden">
        <Toolbar>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'new', label: 'New', count: count('new') },
              { value: 'in_progress', label: 'In progress', count: count('in_progress') },
              { value: 'resolved', label: 'Resolved', count: count('resolved') },
              { value: 'all', label: 'All' }
            ]}
          />
          <SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Search messages" className="sm:ml-auto sm:w-64" />
        </Toolbar>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <Rows />
        ) : !items.length ? (
          <Empty icon={Mail} title="Inbox zero" description="No messages in this view." />
        ) : (
          <div className="grid md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto border-b border-line md:border-b-0 md:border-r">
              {items.map(item => (
                <li key={item.id}>
                  <button onClick={() => setOpenId(item.id)} className={cn('flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-subtle', open?.id === item.id && 'bg-subtle')}>
                    <Avatar name={item.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn('truncate text-sm', item.status === 'new' ? 'font-bold' : 'font-medium')}>{item.name}</span>
                        <span className="shrink-0 text-xs text-faint">{ago(item.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[13px] text-muted">{item.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {open ? (
              <article className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={open.name} className="h-11 w-11 text-sm" />
                    <div>
                      <h2 className="font-display text-lg font-semibold">{open.name}</h2>
                      <p className="text-sm text-muted">{open.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone="brand">{humanize(open.topic)}</Badge>
                    <StatusBadge status={open.status} />
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Detail label="Company">{open.company || 'Not given'}</Detail>
                  <Detail label="Country">
                    <CountryName iso={resolveCountry(open.country)} />
                  </Detail>
                  <Detail label="Received">{dateTime(open.createdAt)}</Detail>
                </dl>
                <p className="mt-6 whitespace-pre-wrap rounded-xl bg-subtle p-4 text-[14.5px] leading-relaxed">{open.message}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: your Afrigo enquiry`)}`}
                    onClick={() => open.status === 'new' && void setStatus(open, 'in_progress')}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary/90"
                  >
                    <Reply className="h-4 w-4" /> Reply by email
                  </a>
                  {open.status !== 'resolved' ? (
                    <Button loading={busy === `${open.id}:resolved`} onClick={() => void setStatus(open, 'resolved')}>
                      <CheckCheck className="h-4 w-4" /> Mark resolved
                    </Button>
                  ) : (
                    <Button onClick={() => void setStatus(open, 'in_progress')}>Reopen</Button>
                  )}
                  {open.status !== 'spam' ? (
                    <Button variant="ghost" onClick={() => void setStatus(open, 'spam')}>
                      Mark as spam
                    </Button>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>
        )}
      </Card>
    </>
  )
}
