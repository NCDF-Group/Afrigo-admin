const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat('en')

export const num = (value: number | null | undefined) => whole.format(Math.round(value ?? 0))

export const short = (value: number | null | undefined) => compact.format(value ?? 0)

export const usd = (value: number | null | undefined, full = false) =>
  full ? new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value ?? 0) : `$${compact.format(value ?? 0)}`

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${whole.format(amount)}`
  }
}

export const pct = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(Math.abs(value) < 10 ? 1 : 0)}%`

export function ago(time: number | null | undefined, now = Date.now()) {
  if (!time) return 'Never'
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 45) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return date(time)
}

export const date = (time: number | null | undefined) => (time ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(time) : 'Not set')

export const dateTime = (time: number | null | undefined) =>
  time ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(time) : 'Not set'

export const humanize = (value: string | null | undefined) =>
  (value ?? '')
    .replace(/[_.-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/^./, letter => letter.toUpperCase())

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

export const bytes = (value: number) => (value > 1_000_000 ? `${(value / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1000))} KB`)
