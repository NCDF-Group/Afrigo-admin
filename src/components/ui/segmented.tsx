import { cn } from '@/lib/cn'

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (value: T) => void; options: { value: T; label: React.ReactNode; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cn('no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-subtle p-1', className)}>
      {options.map(option => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-all',
            value === option.value ? 'bg-surface text-fg shadow-card ring-1 ring-line' : 'text-muted hover:text-fg'
          )}
        >
          {option.label}
          {option.count !== undefined ? <span className={cn('tabular rounded-md px-1.5 text-[11px]', value === option.value ? 'bg-primary-soft text-primary' : 'bg-line/70 text-muted')}>{option.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
