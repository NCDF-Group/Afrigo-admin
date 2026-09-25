import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary/90 shadow-sm',
  secondary: 'border border-line bg-surface text-fg hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger: 'bg-danger text-white hover:bg-danger/90 dark:text-canvas',
  success: 'bg-success text-white hover:bg-success/90 dark:text-canvas'
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  icon: 'h-9 w-9 rounded-xl'
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', size = 'md', loading, disabled, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn('inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50', VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
})
