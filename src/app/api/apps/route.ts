import { PLATFORMS, isPlatform } from '@/lib/roles'
import { requireStaff } from '@/lib/server/auth'
import { audit } from '@/lib/server/directory'
import { body, fail, handle, rateLimit, text } from '@/lib/server/http'
import { store } from '@/lib/server/store'

export const dynamic = 'force-dynamic'

const VERSION = /^\d+\.\d+\.\d+$/
const FLAGS = ['payments', 'chat', 'marketplace', 'imageSearch', 'liveTracking'] as const
const TONES = ['info', 'success', 'warning', 'danger']

const DEFAULT_CONFIG = {
  latestVersion: '1.0.0',
  minSupportedVersion: '1.0.0',
  forceUpdate: false,
  maintenanceMode: false,
  maintenanceMessage: '',
  storeUrl: '',
  banner: { enabled: false, text: '', tone: 'info', link: '' },
  flags: { payments: false, chat: true, marketplace: true, imageSearch: false, liveTracking: true }
}

export const GET = handle(async request => {
  await requireStaff(request, 'apps:manage')
  const [docs, users] = await Promise.all([store().list('appConfig'), store().list('users', { limit: 50_000 })])
  const versions: Record<string, Record<string, number>> = { web: {}, ios: {}, android: {} }
  for (const user of users) {
    if (!user.role || !isPlatform(user.platform) || !user.appVersion) continue
    versions[user.platform][user.appVersion] = (versions[user.platform][user.appVersion] ?? 0) + 1
  }
  const configs = Object.fromEntries(PLATFORMS.map(platform => [platform, { ...DEFAULT_CONFIG, ...(docs.find(doc => doc.id === platform) ?? {}), id: platform }]))
  return { configs, versions }
})

export const PUT = handle(async request => {
  const staff = await requireStaff(request, 'apps:manage')
  rateLimit(`apps:${staff.uid}`, 20)
  const input = await body(request)
  if (!isPlatform(input.platform)) fail(400, 'Unknown platform')
  const config = input.config ?? {}
  const latestVersion = text(config.latestVersion, 20)
  const minSupportedVersion = text(config.minSupportedVersion, 20)
  if (!VERSION.test(latestVersion) || !VERSION.test(minSupportedVersion)) fail(400, 'Versions must look like 2.5.0')
  const storeUrl = text(config.storeUrl, 300)
  if (storeUrl && !storeUrl.startsWith('https://')) fail(400, 'The store link must start with https://')
  const next = {
    latestVersion,
    minSupportedVersion,
    forceUpdate: Boolean(config.forceUpdate),
    maintenanceMode: Boolean(config.maintenanceMode),
    maintenanceMessage: text(config.maintenanceMessage, 300),
    storeUrl,
    banner: {
      enabled: Boolean(config.banner?.enabled),
      text: text(config.banner?.text, 200),
      tone: TONES.includes(config.banner?.tone) ? config.banner.tone : 'info',
      link: text(config.banner?.link, 300)
    },
    flags: Object.fromEntries(FLAGS.map(flag => [flag, Boolean(config.flags?.[flag])])),
    updatedAt: new Date(),
    updatedBy: staff.email
  }
  if (next.maintenanceMode && !next.maintenanceMessage) fail(400, 'Tell users why the app is in maintenance.')
  await store().set('appConfig', input.platform, next, false)
  await audit(staff, 'app.config', input.platform, { maintenanceMode: next.maintenanceMode, forceUpdate: next.forceUpdate, latestVersion })
  return { config: { ...next, id: input.platform, updatedAt: Date.now() } }
})
