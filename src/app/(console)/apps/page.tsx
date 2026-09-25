'use client'
import { AlertTriangle, Globe, Monitor, Save, Smartphone, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApi } from '@/lib/client/api'
import { useLive } from '@/lib/client/live'
import { cn } from '@/lib/cn'
import { ago, num } from '@/lib/format'
import { PLATFORM_LABELS, type Platform } from '@/lib/roles'
import { BarList } from '@/components/charts/charts'
import { Kpi } from '@/components/dashboard/widgets'
import { useMutation } from '@/components/ui/action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/field'
import { PageHeader } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { ErrorState, Skeleton } from '@/components/ui/states'

type Config = {
  id: Platform
  latestVersion: string
  minSupportedVersion: string
  forceUpdate: boolean
  maintenanceMode: boolean
  maintenanceMessage: string
  storeUrl: string
  banner: { enabled: boolean; text: string; tone: string; link: string }
  flags: Record<string, boolean>
  updatedAt?: number
  updatedBy?: string
}

const FLAGS: { key: string; label: string; description: string }[] = [
  { key: 'marketplace', label: 'Marketplace', description: 'Browse listings, post requests and place bids' },
  { key: 'chat', label: 'Trade chat', description: 'Messaging between buyers, sellers and exporters' },
  { key: 'payments', label: 'Payments and escrow', description: 'Pay for trades inside Afrigo' },
  // { key: 'liveTracking', label: 'Live shipment tracking', description: 'Milestones and carrier tracking' },
  { key: 'imageSearch', label: 'Image search', description: 'Find products by photo' }
]

const TONE_STYLE: Record<string, string> = {
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger'
}

function Preview({ config }: { config: Config }) {
  const mobile = config.id !== 'web'
  return (
    <div className={cn('mx-auto overflow-hidden border-[6px] border-fg/90 bg-canvas shadow-pop', mobile ? 'aspect-[9/17] w-full max-w-[220px] rounded-[34px]' : 'aspect-[16/11] w-full rounded-xl')}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between bg-[#012A22] px-3 py-2.5">
          <img src="/brand/afrigo-lockup-light.svg" alt="" className="h-3.5 w-auto" />
          <span className="h-1.5 w-8 rounded-full bg-white/30" />
        </div>
        {config.banner.enabled && config.banner.text ? <div className={cn('px-3 py-2 text-[10px] font-semibold leading-snug', TONE_STYLE[config.banner.tone])}>{config.banner.text}</div> : null}
        {config.maintenanceMode ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
            <Wrench className="h-6 w-6 text-warning" />
            <p className="text-[11px] font-bold">Down for maintenance</p>
            <p className="text-[10px] leading-snug text-muted">{config.maintenanceMessage || 'We will be back shortly.'}</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2 p-3">
            <div className="h-14 rounded-lg bg-primary/15" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: mobile ? 4 : 6 }, (_, index) => (
                <div key={index} className="h-10 rounded-lg bg-subtle ring-1 ring-line" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AppsPage() {
  const { data, error, loading, reload } = useApi<{ configs: Record<Platform, Config>; versions: Record<Platform, Record<string, number>> }>('/api/apps')
  const { snapshot } = useLive()
  const [platform, setPlatform] = useState<Platform>('android')
  const [draft, setDraft] = useState<Config | null>(null)
  const { run, busy } = useMutation()

  useEffect(() => {
    if (data) setDraft(structuredClone(data.configs[platform]))
  }, [data, platform])

  const dirty = useMemo(() => Boolean(data && draft && JSON.stringify(draft) !== JSON.stringify(data.configs[platform])), [data, draft, platform])

  const update = (patch: Partial<Config>) => setDraft(current => (current ? { ...current, ...patch } : current))

  const save = async () => {
    if (!draft) return
    const result = await run<{ config: Config }>('save', '/api/apps', { method: 'PUT', json: { platform, config: draft } }, `${PLATFORM_LABELS[platform]} settings published`)
    if (result) void reload()
  }

  const versions = Object.entries(data?.versions[platform] ?? {}).sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }))
  const stats = snapshot?.platforms[platform]

  return (
    <>
      <PageHeader
        title="App control"
        description="Ship settings to the web app and the iOS and Android apps without a release. Changes reach devices the next time they check in."
        actions={
          <Button variant="primary" loading={busy === 'save'} disabled={!dirty} onClick={() => void save()}>
            <Save className="h-4 w-4" /> Publish changes
          </Button>
        }
      />

      <Segmented
        value={platform}
        onChange={setPlatform}
        className="mb-4 w-fit"
        options={[
          { value: 'android', label: <><Smartphone className="h-4 w-4" /> Android</> },
          { value: 'ios', label: <><Smartphone className="h-4 w-4" /> iOS</> },
          { value: 'web', label: <><Monitor className="h-4 w-4" /> Web</> }
        ]}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi label="Members" value={num(stats?.users)} icon={Globe} />
        <Kpi label="Active now" value={num(stats?.activeNow)} />
        <Kpi label="Events today" value={num(stats?.eventsToday)} />
      </div>

      {error ? (
        <Card className="mt-4">
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : loading || !draft ? (
        <Skeleton className="mt-4 h-96" />
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {draft.maintenanceMode ? (
              <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                Maintenance mode blocks every {PLATFORM_LABELS[platform]} member from using the app until you turn it off.
              </div>
            ) : null}

            <Card>
              <CardHeader title="Versions and updates" description={platform === 'web' ? 'Controls the reload prompt for open browser tabs' : 'Controls the update prompt inside the app'} />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Latest version">
                  <Input value={draft.latestVersion} onChange={event => update({ latestVersion: event.target.value })} placeholder="2.5.0" inputMode="decimal" />
                </Field>
                <Field label="Minimum supported version" hint="Older versions are asked to update">
                  <Input value={draft.minSupportedVersion} onChange={event => update({ minSupportedVersion: event.target.value })} placeholder="2.4.0" inputMode="decimal" />
                </Field>
                <Field label={platform === 'web' ? 'App URL' : 'Store link'} className="sm:col-span-2">
                  <Input value={draft.storeUrl} onChange={event => update({ storeUrl: event.target.value })} placeholder="https://" />
                </Field>
                <div className="sm:col-span-2">
                  <Switch checked={draft.forceUpdate} onChange={value => update({ forceUpdate: value })} label="Force update" description="Members below the minimum version cannot continue until they update" />
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Maintenance" />
              <div className="space-y-4 p-5">
                <Switch checked={draft.maintenanceMode} onChange={value => update({ maintenanceMode: value })} label="Maintenance mode" description="Show a maintenance screen instead of the app" />
                <Field label="Message shown to members">
                  <Textarea value={draft.maintenanceMessage} onChange={event => update({ maintenanceMessage: event.target.value })} placeholder="We are upgrading payments. Back by 14:00 WAT." />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader title="Announcement banner" />
              <div className="space-y-4 p-5">
                <Switch checked={draft.banner.enabled} onChange={value => update({ banner: { ...draft.banner, enabled: value } })} label="Show banner" description="A slim message across the top of the app" />
                <Field label="Text">
                  <Input value={draft.banner.text} onChange={event => update({ banner: { ...draft.banner, text: event.target.value } })} maxLength={200} placeholder="New: ship to 12 more countries" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Style">
                    <Select value={draft.banner.tone} onChange={event => update({ banner: { ...draft.banner, tone: event.target.value } })}>
                      <option value="info">Information</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="danger">Critical</option>
                    </Select>
                  </Field>
                  <Field label="Link (optional)">
                    <Input value={draft.banner.link} onChange={event => update({ banner: { ...draft.banner, link: event.target.value } })} placeholder="https:// or afrigo://" />
                  </Field>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Features" description="Turn features on or off for this platform only" />
              <div className="divide-y divide-line px-5">
                {FLAGS.map(flag => (
                  <div key={flag.key} className="py-4">
                    <Switch checked={Boolean(draft.flags[flag.key])} onChange={value => update({ flags: { ...draft.flags, [flag.key]: value } })} label={flag.label} description={flag.description} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wider text-faint">Preview</p>
                {dirty ? <Badge tone="warning">Unpublished</Badge> : <Badge tone="success">Live</Badge>}
              </div>
              <Preview config={draft} />
              {data?.configs[platform].updatedAt ? (
                <p className="mt-4 text-center text-xs text-muted">
                  Last published {ago(data.configs[platform].updatedAt)}
                  {data.configs[platform].updatedBy ? ` by ${data.configs[platform].updatedBy}` : ''}
                </p>
              ) : null}
            </Card>
            {platform !== 'web' ? (
              <Card>
                <CardHeader title="Version adoption" description="Members by installed version" />
                <div className="p-5">{versions.length ? <BarList format={num} items={versions.map(([version, count]) => ({ key: version, label: `v${version}${version === draft.latestVersion ? '  (latest)' : ''}`, value: count }))} /> : <p className="text-sm text-muted">No version data reported yet.</p>}</div>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
