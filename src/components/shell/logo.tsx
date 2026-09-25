import { cn } from '@/lib/cn'

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  if (compact) return <img src="/brand/afrigo-mark.svg" alt="Afrigo" width={32} height={26} className={cn('h-7 w-auto', className)} />
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img src="/brand/afrigo-lockup.svg" alt="Afrigo" width={120} height={24} className="h-6 w-auto dark:hidden" />
      <img src="/brand/afrigo-lockup-light.svg" alt="Afrigo" width={120} height={24} className="hidden h-6 w-auto dark:block" />
    </span>
  )
}
