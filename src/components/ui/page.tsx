import { cn } from '@/lib/cn'

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-fg sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:flex-wrap sm:items-center', className)}>{children}</div>
}

export function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm text-fg">{children}</dd>
    </div>
  )
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-faint">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
