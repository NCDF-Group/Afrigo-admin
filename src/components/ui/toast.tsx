'use client'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'
import { cn } from '@/lib/cn'

type Toast = { id: number; tone: 'success' | 'error'; message: string }

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts(items => items.filter(item => item.id !== id)), [])
  const push = useCallback(
    (message: string, tone: Toast['tone'] = 'success') => {
      const id = Date.now() + Math.random()
      setToasts(items => [...items.slice(-3), { id, tone, message }])
      setTimeout(() => dismiss(id), 4200)
    },
    [dismiss]
  )
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop">
            {toast.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
            <p className={cn('flex-1 text-sm font-medium leading-snug')}>{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="text-faint hover:text-fg" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
