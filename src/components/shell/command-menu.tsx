'use client'
import { CornerDownLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@/lib/client/session'
import { cn } from '@/lib/cn'
import { COUNTRIES } from '@/lib/geo/countries'
import { Flag } from '@/components/ui/identity'
import { NAV } from './nav'

type Entry = { id: string; label: string; hint: string; href: string; icon: React.ReactNode }

export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { can } = useSession()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const entries = useMemo<Entry[]>(() => {
    const pages = NAV.flatMap(group => group.items.filter(item => can(item.capability)).map(item => ({ id: item.href, label: item.label, hint: group.label, href: item.href, icon: <item.icon className="h-4 w-4" /> })))
    const countries = can('analytics:read') ? COUNTRIES.map(country => ({ id: country.iso, label: country.name, hint: 'Country', href: `/countries/${country.iso}`, icon: <Flag iso={country.iso} /> })) : []
    const term = query.trim().toLowerCase()
    const all = [...pages, ...countries]
    return (term ? all.filter(entry => entry.label.toLowerCase().includes(term)) : pages).slice(0, 12)
  }, [query, can])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCursor(0)
    requestAnimationFrame(() => input.current?.focus())
  }, [open])

  useEffect(() => setCursor(0), [query])

  if (!open || typeof document === 'undefined') return null

  const go = (entry?: Entry) => {
    if (!entry) return
    router.push(entry.href)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-faint" />
          <input
            ref={input}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setCursor(value => Math.min(entries.length - 1, value + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setCursor(value => Math.max(0, value - 1))
              } else if (event.key === 'Enter') go(entries[cursor])
              else if (event.key === 'Escape') onClose()
            }}
            placeholder="Jump to a page or country"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            aria-label="Search"
          />
          <kbd className="rounded-md border border-line px-1.5 text-[11px] text-faint">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {entries.length ? (
            entries.map((entry, index) => (
              <li key={entry.id} role="option" aria-selected={index === cursor}>
                <button
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => go(entry)}
                  className={cn('flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm', index === cursor ? 'bg-subtle text-fg' : 'text-muted')}
                >
                  <span className="grid w-5 place-items-center">{entry.icon}</span>
                  <span className="flex-1 truncate font-semibold text-fg">{entry.label}</span>
                  <span className="text-xs text-faint">{entry.hint}</span>
                  {index === cursor ? <CornerDownLeft className="h-3.5 w-3.5 text-faint" /> : null}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-8 text-center text-sm text-muted">No matches</li>
          )}
        </ul>
      </div>
    </div>,
    document.body
  )
}
