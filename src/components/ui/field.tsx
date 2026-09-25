import { ChevronDown, Search } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

const control = 'w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-faint transition-colors hover:border-faint/60 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, 'h-10', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-[96px] resize-y py-2.5 leading-relaxed', className)} {...props} />
})

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(control, 'h-10 appearance-none pr-9')} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
    </div>
  )
}

export function SearchInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input type="search" className={cn(control, 'h-10 pl-9')} {...props} />
    </div>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[13px] font-semibold text-fg">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold transition-colors', active ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface text-muted hover:text-fg')}
    >
      {children}
    </button>
  )
}
