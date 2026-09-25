import { cn } from '@/lib/cn'
import { humanize } from '@/lib/format'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const TONES: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted ring-line',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  info: 'bg-info-soft text-info ring-info/20',
  brand: 'bg-primary-soft text-primary ring-primary/20'
}

export function Badge({ tone = 'neutral', dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset', TONES[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

const STATUS: Record<string, Tone> = {
  active: 'success',
  verified: 'success',
  approved: 'success',
  completed: 'success',
  delivered: 'success',
  paid: 'success',
  success: 'success',
  resolved: 'success',
  open: 'info',
  public: 'info',
  accepted: 'info',
  shipping: 'info',
  in_transit: 'info',
  in_progress: 'info',
  submitted: 'info',
  awarded: 'brand',
  pending: 'warning',
  pending_approval: 'warning',
  partially_approved: 'warning',
  requested: 'warning',
  processing: 'warning',
  reserved: 'warning',
  new: 'warning',
  held: 'danger',
  disputed: 'danger',
  suspended: 'danger',
  rejected: 'danger',
  cancelled: 'neutral',
  archived: 'neutral',
  closed: 'neutral',
  declined: 'neutral',
  private: 'neutral',
  revoked: 'neutral',
  spam: 'neutral',
  not_started: 'neutral'
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const key = String(status ?? 'unknown').toLowerCase().replace(/\s+/g, '_')
  return (
    <Badge tone={STATUS[key] ?? 'neutral'} dot className={className}>
      {humanize(status || 'Unknown')}
    </Badge>
  )
}
