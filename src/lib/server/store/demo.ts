import { COUNTRIES } from '@/lib/geo/countries'
import type { Doc, Store } from './types'

const WEIGHTS: Record<string, number> = {
  ng: 30, gh: 14, ke: 13, za: 12, eg: 10, ci: 9, sn: 7, ma: 8, et: 7, tz: 6, ug: 6, rw: 5, cm: 5, dz: 3, tn: 3, zm: 3, zw: 2, bj: 3, tg: 2, bf: 2, ml: 2, ao: 3, cd: 3, mz: 2, na: 1, bw: 1, mu: 1, mw: 1, gm: 1, sl: 1, lr: 1, ne: 1, gn: 1
}

const PRODUCTS = [
  ['Cocoa beans', 'Grade I'], ['Raw cashew nuts', 'W320'], ['Sesame seeds', 'Hulled 99%'], ['Shea butter', 'Unrefined Grade A'], ['Arabica coffee', 'AA'],
  ['Black tea', 'BP1'], ['Dried ginger', 'Split'], ['Hibiscus flower', 'Sun dried'], ['Cotton lint', 'Middling'], ['Natural rubber', 'TSR 20'],
  ['Crude palm oil', 'FFA 5%'], ['Cassava flour', 'High quality'], ['Hass avocado', 'Size 18'], ['Macadamia nuts', 'Style 1'], ['Soybeans', 'Non GMO'],
  ['Sorghum', 'Red'], ['Vanilla beans', 'Gourmet'], ['Groundnuts', 'Bold 40/50'], ['Cut flowers', 'Roses 50cm'], ['Frozen fish', 'Tilapia whole']
] as const

const FIRST = ['Amara', 'Kwame', 'Zanele', 'Tariq', 'Fatou', 'Chidi', 'Wanjiru', 'Youssef', 'Abebe', 'Nia', 'Kofi', 'Aisha', 'Thabo', 'Mariam', 'Emeka', 'Salma', 'Jabari', 'Ngozi', 'Moussa', 'Lindiwe', 'Tendai', 'Ife', 'Kagiso', 'Awa']
const LAST = ['Okafor', 'Mensah', 'Dlamini', 'Haddad', 'Diallo', 'Mwangi', 'Tesfaye', 'Nkosi', 'Traore', 'Adeyemi', 'Kamau', 'Boateng', 'Ndlovu', 'Sow', 'Banda', 'Mutua', 'Ouedraogo', 'Balogun', 'Kone', 'Moyo']
const SUFFIX = ['Agro Ltd', 'Trading Co', 'Exports', 'Commodities', 'Farms', 'Logistics', 'Holdings', 'Global', 'Industries', 'Ventures']
const CARRIERS = ['DHL', 'Maersk', 'MSC', 'CMA CGM', 'Bollore', 'Kobo360']
const MILESTONES = [['Assigned', 5], ['Picked Up', 20], ['In Transit', 45], ['Customs Clearance', 70], ['Cleared', 85], ['Delivered', 100]] as const
const FX: Record<string, number> = { NGN: 1600, USD: 1, GHS: 15, KES: 129, ZAR: 18 }
const DAY = 86_400_000

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function toolkit(random: () => number) {
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]
  const between = (min: number, max: number) => Math.round(min + random() * (max - min))
  const weighted = Object.entries(WEIGHTS).flatMap(([iso, weight]) => Array(weight).fill(iso) as string[])
  const country = () => (random() < 0.9 ? pick(weighted) : pick(COUNTRIES).iso)
  const platform = () => {
    const value = random()
    return value < 0.46 ? 'android' : value < 0.72 ? 'web' : 'ios'
  }
  return { pick, between, country, platform }
}

const nameOf = (iso: string) => COUNTRIES.find(item => item.iso === iso)?.name ?? iso

export function demoSeed(): Record<string, Doc[]> {
  const random = rng(20260925)
  const { pick, between, country, platform } = toolkit(random)
  const now = Date.now()
  const ago = (maxDays: number) => now - Math.floor(Math.pow(random(), 1.15) * maxDays * DAY)

  const users: Doc[] = []
  const companies: Doc[] = []
  const documents: Doc[] = []
  for (let index = 0; index < 1240; index++) {
    const iso = country()
    const role = pick(['Buyer', 'Buyer', 'Seller', 'Seller', 'Seller', 'Exporter'])
    const first = pick(FIRST), last = pick(LAST)
    const createdAt = ago(210)
    const kyc = random() < 0.64 ? 'verified' : random() < 0.7 ? 'pending' : random() < 0.5 ? 'rejected' : 'not_started'
    const id = `usr_${index.toString(36).padStart(4, '0')}`
    const companyId = `cmp_${index.toString(36).padStart(4, '0')}`
    const userPlatform = platform()
    users.push({
      id,
      email: `${first}.${last}${index}@example.com`.toLowerCase(),
      displayName: `${first} ${last}`,
      role,
      country: nameOf(iso),
      companyId,
      kycStatus: kyc,
      platform: userPlatform,
      appVersion: userPlatform === 'web' ? null : pick(['2.4.0', '2.4.1', '2.5.0', '2.5.0', '2.5.2']),
      status: random() < 0.03 ? 'suspended' : 'active',
      lastActiveAt: now - Math.floor(Math.pow(random(), 3) * 20 * DAY),
      notificationTokens: random() < 0.7 ? [`token-${id}`] : [],
      createdAt,
      updatedAt: createdAt
    })
    companies.push({ id: companyId, name: `${last} ${pick(SUFFIX)}`, country: nameOf(iso), ownerId: id, kycStatus: kyc, createdAt, updatedAt: createdAt })
    if (kyc === 'pending') {
      documents.push({ id: `doc_${index}`, ownerId: id, type: 'kyc', status: 'Submitted', storagePath: `kyc/${id}/certificate.pdf`, meta: { name: pick(['CAC certificate.pdf', 'Business registration.pdf', 'Director ID.png', 'Tax clearance.pdf']), size: between(80_000, 2_400_000), mimeType: 'application/pdf' }, createdAt: ago(12) })
    }
  }

  const byRole = (role: string) => users.filter(user => user.role === role)
  const sellers = byRole('Seller'), buyers = byRole('Buyer'), exporters = byRole('Exporter').filter(user => user.kycStatus === 'verified')

  const lots: Doc[] = Array.from({ length: 420 }, (_, index) => {
    const owner = pick(sellers), [title, grade] = pick(PRODUCTS)
    return { id: `lot_${index}`, ownerId: owner.id, title, grade, quantity: between(5, 400) * 10, unit: pick(['kg', 'kg', 'tonnes', 'bags']), price: between(2, 90) * 10, currency: pick(['USD', 'USD', 'NGN']), origin: owner.country, description: `${title} available for export.`, status: random() < 0.82 ? 'active' : 'archived', visibility: random() < 0.7 ? 'public' : 'private', createdAt: ago(120), updatedAt: ago(20) }
  })

  const rfqs: Doc[] = Array.from({ length: 260 }, (_, index) => {
    const buyer = pick(buyers), [title] = pick(PRODUCTS)
    return { id: `rfq_${index}`, buyerId: buyer.id, buyerName: buyer.displayName, title, quantity: between(10, 800) * 10, unit: pick(['kg', 'tonnes']), destination_country: buyer.country, budget: `${between(5, 400)}k USD`, status: random() < 0.55 ? 'Open' : random() < 0.8 ? 'Awarded' : 'Closed', visibility: random() < 0.6 ? 'public' : 'private', description: `Looking for ${title.toLowerCase()} suppliers.`, createdAt: ago(90), updatedAt: ago(10) }
  })

  const bids: Doc[] = Array.from({ length: 520 }, (_, index) => {
    const rfq = pick(rfqs), seller = pick(sellers)
    return { id: `bid_${index}`, rfqId: rfq.id, supplierId: seller.id, supplierName: seller.displayName, lotId: pick(lots).id, price: between(3, 80) * 10, currency: 'USD', delivery: `${between(2, 8)} weeks`, status: pick(['Submitted', 'Submitted', 'Awarded', 'Declined']), createdAt: ago(80) }
  })

  const contracts: Doc[] = []
  const shipments: Doc[] = []
  const payoutRequests: Doc[] = []
  const supportCases: Doc[] = []
  for (let index = 0; index < 380; index++) {
    const buyer = pick(buyers), seller = pick(sellers), lot = pick(lots)
    const currency = pick(['USD', 'USD', 'NGN', 'GHS', 'KES', 'ZAR'])
    const amount = Math.round(between(2_000, 180_000) * FX[currency])
    const status = pick(['pending', 'accepted', 'paid', 'shipping', 'shipping', 'completed', 'completed', 'completed', 'cancelled', 'disputed'])
    const createdAt = ago(150)
    const id = `ctr_${index}`
    const paid = ['paid', 'shipping', 'completed', 'disputed'].includes(status)
    const contract: Doc = { id, buyerId: buyer.id, supplierId: seller.id, productTitle: lot.title, inventoryLotId: lot.id, quantity: between(10, 400) * 10, amount, currency, status, paymentStatus: paid ? 'paid' : 'not_started', payoutStatus: status === 'completed' ? pick(['pending', 'reserved', 'success', 'success']) : 'pending', createdAt, updatedAt: createdAt + between(1, 20) * DAY, paidAt: paid ? createdAt + 2 * DAY : null }
    if (['shipping', 'completed', 'disputed'].includes(status)) {
      const exporter = pick(exporters)
      contract.exporterId = exporter.id
      const stage = status === 'completed' ? MILESTONES[5] : pick(MILESTONES.slice(0, 5))
      shipments.push({ id: `shp_${index}`, contractId: id, buyerId: buyer.id, supplierId: seller.id, exporterId: exporter.id, status: stage[0], progress: stage[1], carrier: pick(CARRIERS), trackingNumber: `AFG${between(100000, 999999)}`, origin: seller.country, destination: buyer.country, createdAt: createdAt + 3 * DAY, updatedAt: now - between(1, 72) * 3_600_000 })
    }
    if (status === 'disputed') {
      contract.disputeStatus = 'open'
      contract.disputeReason = pick(['Goods arrived below agreed grade', 'Quantity short on delivery', 'Shipment delayed beyond agreed window', 'Documentation mismatch at customs'])
      contract.disputedBy = buyer.id
      supportCases.push({ id: `case_${index}`, contractId: id, buyerId: buyer.id, supplierId: seller.id, openedBy: buyer.id, category: 'contract_dispute', summary: contract.disputeReason, status: 'open', heldAmount: amount, createdAt: now - between(1, 14) * DAY, updatedAt: now - between(0, 3) * DAY })
    }
    if (status === 'completed' && contract.payoutStatus === 'reserved') {
      const large = amount / (FX[currency] ?? 1) > 60_000
      const status = pick(large ? ['pending_approval', 'partially_approved', 'approved'] : ['pending_approval', 'pending_approval', 'approved'])
      const approvalIds = status === 'pending_approval' ? [] : status === 'partially_approved' ? ['staff_2'] : large ? ['staff_1', 'staff_2'] : ['staff_2']
      payoutRequests.push({ id: `pay_${index}`, contractId: id, sellerId: seller.id, amount, currency, status, requiresTwoApprovals: large, approvalIds, riskReasons: large ? ['large_payout'] : [], settlementSnapshot: { accountLast4: String(between(1000, 9999)), bankCode: pick(['058', '044', '011', '033']) }, createdAt: now - between(1, 9) * DAY })
      contract.payoutRequestId = `pay_${index}`
    }
    if (status === 'paid' && random() < 0.25) {
      contract.refundStatus = 'requested'
      contract.refundReason = pick(['Seller unable to fulfil', 'Order placed in error', 'Agreed cancellation'])
    }
    contracts.push(contract)
  }

  supportCases.push(
    ...Array.from({ length: 14 }, (_, index) => {
      const user = pick(users)
      return { id: `case_s${index}`, openedBy: user.id, category: pick(['account_access', 'payment_question', 'listing_issue', 'app_bug']), summary: pick(['Cannot upload KYC document from iOS app', 'Payment confirmation missing', 'Listing rejected without reason', 'Android app crashes on chat screen', 'Need to change company name']), status: 'open', createdAt: now - between(0, 10) * DAY, updatedAt: now - between(0, 2) * DAY }
    })
  )

  const compliance_actions: Doc[] = Array.from({ length: 22 }, (_, index) => ({ id: `cmp_act_${index}`, ownerId: pick(exporters).id, category: pick(['Phytosanitary certificate', 'Certificate of origin', 'Export permit', 'Fumigation certificate']), requirement: 'Upload a valid certificate for the next shipment', status: 'Pending', dueDate: new Date(now + between(2, 20) * DAY).toISOString().slice(0, 10), createdAt: ago(20) }))

  const activityLogs: Doc[] = Array.from({ length: 1400 }, (_, index) => {
    const user = pick(users)
    const [type, label] = pick([['auth_signin', 'Signed in'], ['page_view', 'Viewed marketplace'], ['form_submit', 'Created rfqs'], ['form_submit', 'Created lots'], ['purchase_created', 'Reserved Seller inventory'], ['shipment_update', 'Shipment In Transit'], ['auth_signup', 'Created account']])
    return { id: `act_${index}`, actorId: user.id, type, label, role: user.role, country: user.country, platform: user.platform, createdAt: now - Math.floor(random() < 0.6 ? random() * DAY : random() * 7 * DAY) }
  })

  const contactSubmissions: Doc[] = Array.from({ length: 18 }, (_, index) => {
    const first = pick(FIRST), last = pick(LAST)
    return { id: `msg_${index}`, name: `${first} ${last}`, email: `${first}.${last}@example.com`.toLowerCase(), company: `${last} ${pick(SUFFIX)}`, country: nameOf(country()), topic: pick(['general', 'partnership', 'support', 'press', 'sales']), message: pick(['We would like to onboard 40 cooperatives onto Afrigo. Who can we speak with?', 'Our shipment documents are stuck. Can someone help?', 'Interested in a partnership for logistics in East Africa.', 'How do we become a verified exporter?', 'Requesting a demo of the platform for our association.']), status: index < 7 ? 'new' : pick(['in_progress', 'resolved']), source: 'website', createdAt: now - between(0, 30) * DAY }
  })

  const staff: Doc[] = [
    { id: 'staff_1', email: 'ops.lead@afrigo.africa', displayName: 'Ada Nwosu', operationalRole: 'admin', staffStatus: 'active', staffAssignedAt: now - 40 * DAY },
    { id: 'staff_2', email: 'finance@afrigo.africa', displayName: 'Kojo Asante', operationalRole: 'finance_operator', staffStatus: 'active', staffAssignedAt: now - 30 * DAY },
    { id: 'staff_3', email: 'risk@afrigo.africa', displayName: 'Leila Benali', operationalRole: 'risk_officer', staffStatus: 'active', staffAssignedAt: now - 22 * DAY },
    { id: 'staff_4', email: 'support@afrigo.africa', displayName: 'Brian Otieno', operationalRole: 'support_agent', staffStatus: 'active', staffAssignedAt: now - 12 * DAY }
  ]

  const appConfig: Doc[] = [
    { id: 'web', latestVersion: '3.2.0', minSupportedVersion: '3.0.0', forceUpdate: false, maintenanceMode: false, maintenanceMessage: '', storeUrl: 'https://afrigo.netlify.app', banner: { enabled: true, text: 'AfCFTA certificate support is now live.', tone: 'info', link: '' }, flags: { payments: false, chat: true, marketplace: true, imageSearch: false, liveTracking: true }, updatedAt: now - 3 * DAY },
    { id: 'ios', latestVersion: '2.5.2', minSupportedVersion: '2.4.0', forceUpdate: false, maintenanceMode: false, maintenanceMessage: '', storeUrl: 'https://apps.apple.com/app/afrigo', banner: { enabled: false, text: '', tone: 'info', link: '' }, flags: { payments: false, chat: true, marketplace: true, imageSearch: true, liveTracking: true }, updatedAt: now - 6 * DAY },
    { id: 'android', latestVersion: '2.5.2', minSupportedVersion: '2.4.1', forceUpdate: true, maintenanceMode: false, maintenanceMessage: '', storeUrl: 'https://play.google.com/store/apps/details?id=africa.afrigo', banner: { enabled: false, text: '', tone: 'info', link: '' }, flags: { payments: false, chat: true, marketplace: true, imageSearch: true, liveTracking: true }, updatedAt: now - 6 * DAY }
  ]

  const broadcasts: Doc[] = [
    { id: 'bc_1', title: 'New buyers from Morocco', body: 'Fresh RFQs for sesame and cashew just landed.', audience: { roles: ['Seller'], countries: [], platforms: ['ios', 'android'] }, recipients: 412, delivered: 398, sentBy: 'ops.lead@afrigo.africa', createdAt: now - 2 * DAY },
    { id: 'bc_2', title: 'Scheduled maintenance', body: 'Afrigo will be briefly unavailable on Sunday 02:00 UTC.', audience: { roles: [], countries: [], platforms: ['web', 'ios', 'android'] }, recipients: 1118, delivered: 1090, sentBy: 'ops.lead@afrigo.africa', createdAt: now - 9 * DAY }
  ]

  return { users: [...users, ...staff], companies, documents, lots, rfqs, bids, contracts, shipments, payoutRequests, supportCases, compliance_actions, activityLogs, contactSubmissions, appConfig, broadcasts, staffRoleAudit: [] }
}

export function startDemoPulse(store: Store & { snapshot: (collection: string) => Doc[] }) {
  const random = rng(Date.now() % 100000)
  const { pick, between, country, platform } = toolkit(random)
  let index = 0

  const tick = async () => {
    const now = Date.now()
    const users = store.snapshot('users').filter(user => user.role)
    const roll = random()
    const actor = pick(users)
    if (roll < 0.08) {
      const iso = country(), role = pick(['Buyer', 'Seller', 'Seller', 'Exporter']), id = `usr_live_${now.toString(36)}_${index++}`, userPlatform = platform()
      const first = pick(FIRST), last = pick(LAST)
      await store.set('users', id, { email: `${first}.${last}.${index}@example.com`.toLowerCase(), displayName: `${first} ${last}`, role, country: nameOf(iso), kycStatus: 'not_started', platform: userPlatform, status: 'active', lastActiveAt: now, notificationTokens: [], createdAt: now, updatedAt: now })
      await store.add('activityLogs', { actorId: id, type: 'auth_signup', label: 'Created account', role, country: nameOf(iso), platform: userPlatform, createdAt: now })
    } else if (roll < 0.18) {
      const [title, grade] = pick(PRODUCTS)
      await store.add('lots', { ownerId: actor.id, title, grade, quantity: between(5, 300) * 10, unit: 'kg', price: between(2, 90) * 10, currency: 'USD', origin: actor.country, status: 'active', visibility: 'public', createdAt: now, updatedAt: now })
      await store.add('activityLogs', { actorId: actor.id, type: 'form_submit', label: `Listed ${title.toLowerCase()}`, role: actor.role, country: actor.country, platform: actor.platform, createdAt: now })
    } else if (roll < 0.26) {
      const seller = pick(users.filter(user => user.role === 'Seller')), [title] = pick(PRODUCTS), currency = pick(['USD', 'NGN', 'KES'])
      const amount = Math.round(between(3_000, 90_000) * FX[currency])
      await store.add('contracts', { buyerId: actor.id, supplierId: seller.id, productTitle: title, quantity: between(10, 300) * 10, amount, currency, status: 'pending', paymentStatus: 'not_started', payoutStatus: 'pending', createdAt: now, updatedAt: now })
      await store.add('activityLogs', { actorId: actor.id, type: 'purchase_created', label: `Opened trade for ${title.toLowerCase()}`, role: 'Buyer', country: actor.country, platform: actor.platform, createdAt: now })
    } else if (roll < 0.36) {
      const shipment = pick(store.snapshot('shipments').filter(item => item.progress < 100))
      if (shipment) {
        const position = MILESTONES.findIndex(([name]) => name === shipment.status)
        const [status, progress] = MILESTONES[Math.min(position + 1, MILESTONES.length - 1)]
        await store.update('shipments', shipment.id, { status, progress, updatedAt: now })
        if (status === 'Delivered') await store.update('contracts', shipment.contractId, { status: 'completed', completedAt: now, updatedAt: now })
        await store.add('activityLogs', { actorId: shipment.exporterId, type: 'shipment_update', label: `Shipment ${status}`, detail: shipment.id, role: 'Exporter', country: shipment.origin, platform: 'android', createdAt: now })
      }
    } else {
      const [type, label] = pick([['auth_signin', 'Signed in'], ['page_view', 'Viewed marketplace'], ['page_view', 'Browsed RFQs'], ['message_sent', 'Sent a message'], ['form_submit', 'Submitted a bid']])
      await store.update('users', actor.id, { lastActiveAt: now })
      await store.add('activityLogs', { actorId: actor.id, type, label, role: actor.role, country: actor.country, platform: actor.platform, createdAt: now })
    }
  }

  return setInterval(() => void tick().catch(() => {}), 1800)
}
