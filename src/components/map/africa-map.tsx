'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { countryByIso } from '@/lib/geo/countries'
import { MAP_VIEWBOX, SHAPES } from '@/lib/geo/shapes'
import { cn } from '@/lib/cn'
import type { CountryStat, LiveEvent } from '@/lib/types'
import { Flag } from '@/components/ui/identity'

export type MapMetric = { key: string; label: string; value: (stat: CountryStat) => number; format: (value: number) => string }

const STEPS = [0.18, 0.36, 0.56, 0.78, 1]

const shapeByIso = new Map(SHAPES.map(shape => [shape.iso, shape]))

export function AfricaMap({ stats, metric, events = [], selected, onSelect, details }: { stats: CountryStat[]; metric: MapMetric; events?: LiveEvent[]; selected?: string | null; onSelect?: (iso: string) => void; details?: (stat: CountryStat) => { label: string; value: string }[] }) {
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null)
  const [pulses, setPulses] = useState<{ id: string; iso: string }[]>([])
  const seen = useRef<Set<string> | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const byIso = useMemo(() => new Map(stats.map(stat => [stat.iso, stat])), [stats])
  const max = useMemo(() => Math.max(1, ...stats.map(metric.value)), [stats, metric])

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(events.map(event => event.id))
      return
    }
    const fresh = events.filter(event => !seen.current!.has(event.id) && event.country && shapeByIso.has(event.country)).slice(0, 6)
    events.forEach(event => seen.current!.add(event.id))
    if (!fresh.length) return
    setPulses(current => [...current, ...fresh.map(event => ({ id: event.id, iso: event.country! }))].slice(-14))
    const ids = new Set(fresh.map(event => event.id))
    const timer = setTimeout(() => setPulses(current => current.filter(pulse => !ids.has(pulse.id))), 2000)
    return () => clearTimeout(timer)
  }, [events])

  const level = (iso: string) => {
    const stat = byIso.get(iso)
    const value = stat ? metric.value(stat) : 0
    if (!value) return -1
    const ratio = Math.sqrt(value / max)
    return STEPS.findIndex(step => ratio <= step)
  }

  const fill = (iso: string) => {
    const index = level(iso)
    return index < 0 ? 'rgb(var(--map-empty))' : `rgb(var(--viz-seq) / ${0.22 + index * 0.195})`
  }

  const track = (iso: string, event: React.PointerEvent) => {
    if (!frame.current) return
    const box = frame.current.getBoundingClientRect()
    setHover({ iso, x: event.clientX - box.left, y: event.clientY - box.top })
  }

  const hovered = hover ? byIso.get(hover.iso) : null
  const country = hover ? countryByIso(hover.iso) : null

  return (
    <div ref={frame} className="relative select-none" onPointerLeave={() => setHover(null)}>
      <svg viewBox={MAP_VIEWBOX} className="h-auto w-full" role="img" aria-label={`Map of Africa shaded by ${metric.label.toLowerCase()}`}>
        {SHAPES.map(shape =>
          shape.d ? (
            <path
              key={shape.iso}
              d={shape.d}
              fill={fill(shape.iso)}
              stroke={selected === shape.iso ? 'rgb(var(--fg))' : 'rgb(var(--map-stroke))'}
              strokeWidth={selected === shape.iso ? 2 : 0.9}
              className={cn('cursor-pointer transition-[fill,opacity] duration-500', hover && hover.iso !== shape.iso && 'opacity-80')}
              onPointerMove={event => track(shape.iso, event)}
              onClick={() => onSelect?.(shape.iso)}
            />
          ) : (
            <circle
              key={shape.iso}
              cx={shape.x}
              cy={shape.y}
              r={6}
              fill={fill(shape.iso)}
              stroke={selected === shape.iso ? 'rgb(var(--fg))' : 'rgb(var(--faint))'}
              strokeWidth={1}
              className="cursor-pointer"
              onPointerMove={event => track(shape.iso, event)}
              onClick={() => onSelect?.(shape.iso)}
            />
          )
        )}
        {pulses.map(pulse => {
          const shape = shapeByIso.get(pulse.iso)!
          return (
            <g key={pulse.id} className="pointer-events-none">
              <circle cx={shape.x} cy={shape.y} r={5} fill="rgb(var(--accent))" className="origin-center animate-ping-soft" style={{ transformBox: 'fill-box' }} />
              <circle cx={shape.x} cy={shape.y} r={3.5} fill="rgb(var(--accent))" stroke="rgb(var(--surface))" strokeWidth={1.5} />
            </g>
          )
        })}
      </svg>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
        <span>Fewer</span>
        <div className="flex gap-[2px]">
          <span className="h-2.5 w-6 rounded-l-[4px]" style={{ background: 'rgb(var(--map-empty))' }} />
          {STEPS.map((_, index) => (
            <span key={index} className={cn('h-2.5 w-6', index === STEPS.length - 1 && 'rounded-r-[4px]')} style={{ background: `rgb(var(--viz-seq) / ${0.22 + index * 0.195})` }} />
          ))}
        </div>
        <span>More {metric.label.toLowerCase()}</span>
      </div>

      {hover && country ? (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-xl border border-line bg-surface p-3 shadow-pop"
          style={{ left: Math.min(hover.x + 14, (frame.current?.clientWidth ?? 0) - 232), top: Math.max(0, hover.y - 20) }}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Flag iso={country.iso} />
            {country.name}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted">{metric.label}</span>
            <span className="tabular text-sm font-bold">{metric.format(hovered ? metric.value(hovered) : 0)}</span>
          </div>
          {hovered && details ? (
            <dl className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
              {details(hovered).map(item => (
                <div key={item.label} className="flex justify-between gap-2">
                  <dt className="text-muted">{item.label}</dt>
                  <dd className="tabular font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
