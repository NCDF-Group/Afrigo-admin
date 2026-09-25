import { Activity, AppWindow, BadgeCheck, Bell, Globe2, Handshake, LayoutDashboard, Mail, Scale, ShieldCheck, Store, Truck, Users, Wallet } from 'lucide-react'
import type { Capability } from '@/lib/roles'
import type { Queues } from '@/lib/types'

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; capability: Capability; badge?: (queues: Queues) => number }

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Insights',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard, capability: 'analytics:read' },
      { href: '/countries', label: 'Countries', icon: Globe2, capability: 'analytics:read' },
      { href: '/activity', label: 'Activity', icon: Activity, capability: 'analytics:read' }
    ]
  },
  {
    label: 'Operations',
    items: [
      { href: '/users', label: 'Members', icon: Users, capability: 'users:read' },
      { href: '/verification', label: 'Verification', icon: BadgeCheck, capability: 'risk:read', badge: queues => queues.kyc + queues.compliance },
      { href: '/marketplace', label: 'Marketplace', icon: Store, capability: 'marketplace:moderate' },
      { href: '/trades', label: 'Trades', icon: Handshake, capability: 'cases:read' },
      { href: '/shipments', label: 'Shipments', icon: Truck, capability: 'cases:read' },
      { href: '/disputes', label: 'Disputes & support', icon: Scale, capability: 'cases:read', badge: queues => queues.disputes + queues.support },
      { href: '/finance', label: 'Finance', icon: Wallet, capability: 'finance:read', badge: queues => queues.payouts + queues.refunds }
    ]
  },
  {
    label: 'Web & mobile',
    items: [
      { href: '/apps', label: 'App control', icon: AppWindow, capability: 'apps:manage' },
      { href: '/notifications', label: 'Push notifications', icon: Bell, capability: 'notifications:send' },
      { href: '/inbox', label: 'Inbox', icon: Mail, capability: 'inbox:manage', badge: queues => queues.inbox }
    ]
  },
  {
    label: 'Administration',
    items: [{ href: '/staff', label: 'Staff & access', icon: ShieldCheck, capability: 'staff:manage' }]
  }
]
