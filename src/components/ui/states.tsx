import { AlertTriangle, Inbox, RotateCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './button'

export function Empty({ title, description, icon: Icon = Inbox, className }: { title: string; description?: string; icon?: React.ComponentType<{ className?: string }>; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-subtle text-faint ring-1 ring-line">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 font-semibold text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="mt-4 font-semibold">We could not load this</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </Button>
      ) : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function Rows({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}
