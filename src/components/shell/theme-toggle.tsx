'use client'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div role="radiogroup" aria-label="Theme" className={cn('inline-flex rounded-xl border border-line bg-subtle p-0.5', className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn('grid h-7 w-8 place-items-center rounded-[10px] text-muted transition-colors hover:text-fg', active && 'bg-surface text-fg shadow-card ring-1 ring-line')}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
