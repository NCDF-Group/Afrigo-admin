import { countryByIso } from '@/lib/geo/countries'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export function Flag({ iso, className }: { iso: string | null | undefined; className?: string }) {
  if (!iso || !countryByIso(iso)) return <span className={cn('inline-block h-3.5 w-5 shrink-0 rounded-[3px] bg-line', className)} />
  return <img src={`/flags/${iso}.svg`} alt="" width={20} height={14} loading="lazy" className={cn('h-3.5 w-5 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10', className)} />
}

export function CountryName({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const country = countryByIso(iso)
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Flag iso={iso} />
      <span className="truncate">{country?.name ?? 'Unknown'}</span>
    </span>
  )
}

const HUES = ['bg-emerald-600', 'bg-lime-600', 'bg-teal-600', 'bg-sky-600', 'bg-amber-600', 'bg-rose-600', 'bg-violet-600', 'bg-cyan-700']

export function Avatar({ name, className }: { name: string; className?: string }) {
  const hue = HUES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % HUES.length]
  return <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white', hue, className)}>{initials(name) || '?'}</span>
}

export function PersonCell({ person, sub }: { person: { name: string; country?: string | null } | null; sub?: React.ReactNode }) {
  if (!person) return <span className="text-faint">Not assigned</span>
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={person.name} className="h-7 w-7 text-[10px]" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{person.name}</span>
        {sub ?? (person.country ? <span className="flex items-center gap-1.5 text-xs text-muted"><Flag iso={person.country} className="h-2.5 w-3.5" />{countryByIso(person.country)?.name}</span> : null)}
      </span>
    </span>
  )
}
