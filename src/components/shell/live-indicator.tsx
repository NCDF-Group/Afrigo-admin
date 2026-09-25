'use client'
import { useLive } from '@/lib/client/live'
import { cn } from '@/lib/cn'

export function LiveIndicator({ className }: { className?: string }) {
  const { status } = useLive()
  const label = status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Reconnecting'
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold', className)} aria-live="polite">
      <span className="relative flex h-2 w-2">
        {status === 'live' ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /> : null}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', status === 'live' ? 'bg-success' : status === 'connecting' ? 'bg-warning' : 'bg-danger')} />
      </span>
      {label}
    </span>
  )
}
