'use client'
import { Menu, Search, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LiveProvider } from '@/lib/client/live'
import { useSession } from '@/lib/client/session'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { CommandMenu } from './command-menu'
import { LiveIndicator } from './live-indicator'
import { Logo } from './logo'
import { MobileNavigation, Sidebar } from './sidebar'
import { ThemeToggle } from './theme-toggle'

const COLLAPSE_KEY = 'afrigo-admin:sidebar'

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Logo compact className="h-10 animate-pulse" />
        <p className="text-sm text-muted">Loading the console</p>
      </div>
    </div>
  )
}

function Denied({ message, onSignOut }: { message: string | null; onSignOut: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message || 'This account is not assigned an operational role.'} Ask a super administrator to grant access from Staff & access.</p>
        <Button className="mt-6" onClick={onSignOut}>
          Use a different account
        </Button>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, error, signOut } = useSession()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [command, setCommand] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {}
  }, [])

  useEffect(() => {
    if (status === 'signed-out') router.replace('/sign-in')
  }, [status, router])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommand(value => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (status === 'loading' || status === 'signed-out') return <Splash />
  if (status === 'denied') return <Denied message={error} onSignOut={() => void signOut()} />

  const toggle = () =>
    setCollapsed(value => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1')
      } catch {}
      return !value
    })

  return (
    <LiveProvider>
      <div className="flex min-h-dvh">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <MobileNavigation open={drawer} onClose={() => setDrawer(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-xl sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
            <Logo compact className="h-6 lg:hidden" />
            <button
              onClick={() => setCommand(true)}
              className={cn('hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-sm text-faint transition-colors hover:border-faint/60 sm:flex')}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search pages and countries</span>
              <kbd className="rounded-md border border-line bg-subtle px-1.5 text-[11px] font-semibold">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setCommand(true)} aria-label="Search">
                <Search className="h-5 w-5" />
              </Button>
              <LiveIndicator />
              <ThemeToggle className="hidden sm:inline-flex" />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
          <div className="flex justify-center pb-6 sm:hidden">
            <ThemeToggle />
          </div>
        </div>
      </div>
      <CommandMenu open={command} onClose={() => setCommand(false)} />
    </LiveProvider>
  )
}
