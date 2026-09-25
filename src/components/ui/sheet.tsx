'use client'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from './button'

function useLockedEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
}

export function Sheet({ open, onClose, title, subtitle, footer, children, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useLockedEscape(open, onClose)
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className={cn('relative flex h-full w-full animate-slide-in flex-col border-l border-line bg-surface shadow-pop', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle ? <div className="mt-0.5 text-[13px] text-muted">{subtitle}</div> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="pb-safe flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-5 pt-4">{footer}</footer> : null}
      </aside>
    </div>,
    document.body
  )
}

export function Dialog({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; footer: React.ReactNode }) {
  useLockedEscape(open, onClose)
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div role="alertdialog" aria-modal="true" className="relative w-full animate-rise rounded-t-2xl border border-line bg-surface p-5 shadow-pop sm:max-w-md sm:rounded-2xl">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="pb-safe mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:pb-0">{footer}</div>
      </div>
    </div>,
    document.body
  )
}
