'use client'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

const niceMax = (value: number) => {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 2.5, 5, 10].map(step => step * power).find(step => step >= value) ?? value
}

export type Point = { x: number; y: number; label: string }

export function AreaChart({ points, format, height = 220, color = 'var(--viz-seq)', label }: { points: Point[]; format: (value: number) => string; height?: number; color?: string; label: string }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradient = useId()
  const pad = { top: 12, right: 8, bottom: 26, left: 44 }
  const max = niceMax(Math.max(...points.map(point => point.y), 0))
  const innerWidth = Math.max(0, width - pad.left - pad.right)
  const innerHeight = height - pad.top - pad.bottom
  const x = (index: number) => pad.left + (points.length > 1 ? (index / (points.length - 1)) * innerWidth : 0)
  const y = (value: number) => pad.top + innerHeight - (value / max) * innerHeight
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.y).toFixed(1)}`).join('')
  const area = points.length ? `${line}L${x(points.length - 1)},${pad.top + innerHeight}L${x(0)},${pad.top + innerHeight}Z` : ''
  const ticks = [0, 0.5, 1].map(step => step * max)
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerWidth / 72))))

  const onMove = (event: React.PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / box.width
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))))
  }

  const active = hover !== null ? points[hover] : null

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.22" />
              <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(tick => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgb(var(--line))" strokeDasharray={tick ? '3 4' : undefined} />
              <text x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-faint text-[11px] tabular">
                {format(tick)}
              </text>
            </g>
          ))}
          {points.map((point, index) =>
            index % labelEvery === 0 ? (
              <text key={point.x} x={x(index)} y={height - 6} textAnchor="middle" className="fill-faint text-[11px]">
                {point.label}
              </text>
            ) : null
          )}
          <path d={area} fill={`url(#${gradient})`} />
          <path d={line} fill="none" stroke={`rgb(${color})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active ? (
            <g>
              <line x1={x(hover!)} x2={x(hover!)} y1={pad.top} y2={pad.top + innerHeight} stroke="rgb(var(--faint))" strokeDasharray="3 3" />
              <circle cx={x(hover!)} cy={y(active.y)} r={4.5} fill={`rgb(${color})`} stroke="rgb(var(--surface))" strokeWidth={2} />
            </g>
          ) : null}
          <rect x={pad.left} y={pad.top} width={innerWidth} height={innerHeight} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      ) : null}
      {active ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-pop"
          style={{ left: Math.min(Math.max(x(hover!), 60), width - 60) }}
        >
          <div className="text-faint">{active.label}</div>
          <div className="tabular font-semibold text-fg">{format(active.y)}</div>
        </div>
      ) : null}
    </div>
  )
}

export function Bars({ values, labels, format, height = 120, label }: { values: number[]; labels: string[]; format: (value: number) => string; height?: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...values)
  return (
    <div className="relative" role="img" aria-label={label}>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {values.map((value, index) => (
          <div key={index} className="flex h-full flex-1 items-end" onPointerEnter={() => setHover(index)} onPointerLeave={() => setHover(null)}>
            <div
              className={cn('w-full rounded-t-[4px] transition-opacity', hover !== null && hover !== index && 'opacity-40')}
              style={{ height: `${Math.max(2, (value / max) * 100)}%`, background: 'rgb(var(--viz-seq))' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-faint">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
      {hover !== null ? (
        <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-pop" style={{ left: `${((hover + 0.5) / values.length) * 100}%` }}>
          <div className="text-faint">{labels[hover]}</div>
          <div className="tabular font-semibold">{format(values[hover])}</div>
        </div>
      ) : null}
    </div>
  )
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const path = useMemo(() => {
    const max = Math.max(1, ...values), min = Math.min(0, ...values)
    return values.map((value, index) => `${index ? 'L' : 'M'}${((index / Math.max(1, values.length - 1)) * 100).toFixed(1)},${(28 - ((value - min) / (max - min || 1)) * 26).toFixed(1)}`).join('')
  }, [values])
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden className={cn('h-8 w-full overflow-visible', className)}>
      <path d={path} fill="none" stroke="rgb(var(--viz-seq))" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export type Slice = { key: string; label: string; value: number; color: string }

export function Donut({ slices, center, sub, format }: { slices: Slice[]; center: string; sub: string; format: (value: number) => string }) {
  const [hover, setHover] = useState<string | null>(null)
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1
  const radius = 42, circumference = 2 * Math.PI * radius, gap = slices.filter(slice => slice.value > 0).length > 1 ? 2 : 0
  let offset = 0
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={slices.map(slice => `${slice.label} ${format(slice.value)}`).join(', ')}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgb(var(--subtle))" strokeWidth="11" />
          {slices.map(slice => {
            const length = (slice.value / total) * circumference
            const dash = Math.max(0, length - gap)
            const element = (
              <circle
                key={slice.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={`rgb(${slice.color})`}
                strokeWidth={hover === slice.key ? 13 : 11}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className={cn('transition-all', hover && hover !== slice.key && 'opacity-40')}
                onPointerEnter={() => setHover(slice.key)}
                onPointerLeave={() => setHover(null)}
              />
            )
            offset += length
            return element
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="tabular font-display text-xl font-bold">{hover ? format(slices.find(slice => slice.key === hover)!.value) : center}</div>
            <div className="text-[11px] text-muted">{hover ? slices.find(slice => slice.key === hover)!.label : sub}</div>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {slices.map(slice => (
          <li key={slice.key} className="flex items-center gap-3 text-sm" onPointerEnter={() => setHover(slice.key)} onPointerLeave={() => setHover(null)}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `rgb(${slice.color})` }} />
            <span className="flex-1 text-muted">{slice.label}</span>
            <span className="tabular font-semibold text-fg">{format(slice.value)}</span>
            <span className="tabular w-11 text-right text-xs text-faint">{Math.round((slice.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarList({ items, format }: { items: { key: string; label: React.ReactNode; value: number; href?: string }[]; format: (value: number) => string }) {
  const max = Math.max(1, ...items.map(item => item.value))
  return (
    <ul className="space-y-1.5">
      {items.map(item => (
        <li key={item.key} className="group relative flex h-9 items-center justify-between gap-3 overflow-hidden rounded-lg px-2.5 text-[13px]">
          <span className="absolute inset-y-0 left-0 rounded-lg bg-primary-soft transition-all group-hover:bg-primary/15" style={{ width: `${(item.value / max) * 100}%` }} />
          <span className="relative min-w-0 truncate font-medium text-fg">{item.label}</span>
          <span className="tabular relative shrink-0 font-semibold text-fg">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  )
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-subtle', className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
