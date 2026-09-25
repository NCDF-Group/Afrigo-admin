'use client'
import { ChevronsLeft, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLive } from '@/lib/client/live'
import { useSession } from '@/lib/client/session'
import { cn } from '@/lib/cn'
import { ROLE_LABELS } from '@/lib/roles'
import { Avatar } from '@/components/ui/identity'
import { Logo } from './logo'
import { NAV } from './nav'

export function Navigation({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { can } = useSession()
  const { snapshot } = useLive()

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV.map(group => {
        const items = group.items.filter(item => can(item.capability))
        if (!items.length) return null
        return (
          <div key={group.label}>
            <p className={cn('mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-faint', collapsed && 'sr-only')}>{group.label}</p>
            <ul className="space-y-0.5">
              {items.map(item => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                const count = snapshot && item.badge ? item.badge(snapshot.queues) : 0
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] font-semibold transition-colors',
                        active ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-subtle hover:text-fg',
                        collapsed && 'justify-center px-0'
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={cn('flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
                      {count > 0 ? (
                        <span className={cn('tabular rounded-full bg-accent/20 px-1.5 text-[11px] font-bold text-fg', collapsed && 'absolute right-1.5 top-1.5 h-2 w-2 bg-accent p-0 text-[0px]')}>{count > 99 ? '99+' : count}</span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function Account({ collapsed }: { collapsed?: boolean }) {
  const { staff, signOut } = useSession()
  if (!staff) return null
  return (
    <div className={cn('flex items-center gap-3 border-t border-line p-3', collapsed && 'flex-col')}>
      <Avatar name={staff.name} />
      <div className={cn('min-w-0 flex-1', collapsed && 'sr-only')}>
        <p className="truncate text-[13px] font-semibold">{staff.name}</p>
        <p className="truncate text-xs text-muted">{ROLE_LABELS[staff.role]}</p>
      </div>
      <button onClick={() => void signOut()} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-fg" aria-label="Sign out" title="Sign out">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-300 lg:flex', collapsed ? 'w-[76px]' : 'w-[264px]')}>
      <div className={cn('flex h-16 items-center border-b border-line px-5', collapsed ? 'justify-center px-0' : 'justify-between')}>
        <Link href="/" aria-label="Afrigo Admin home" className="flex items-center gap-2.5">
          {collapsed ? <Logo compact /> : <Logo />}
          {collapsed ? null : <span className="rounded-md bg-subtle px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-muted ring-1 ring-line">Admin</span>}
        </Link>
        {collapsed ? null : (
          <button onClick={onToggle} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-fg" aria-label="Collapse sidebar">
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>
      {collapsed ? (
        <button onClick={onToggle} className="mx-auto mt-3 grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-fg" aria-label="Expand sidebar">
          <ChevronsLeft className="h-4 w-4 rotate-180" />
        </button>
      ) : null}
      <Navigation collapsed={collapsed} />
      <Account collapsed={collapsed} />
    </aside>
  )
}

export function MobileNavigation({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-[86%] max-w-[300px] animate-slide-in-left flex-col bg-surface shadow-pop">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <Logo />
          <span className="rounded-md bg-subtle px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-muted ring-1 ring-line">Admin</span>
        </div>
        <Navigation onNavigate={onClose} />
        <Account />
      </aside>
    </div>
  )
}
