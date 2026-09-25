'use client'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { num } from '@/lib/format'
import { Button } from './button'
import { Empty, ErrorState, Rows } from './states'

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  sort?: (row: T) => number | string
  align?: 'left' | 'right'
  className?: string
  mobile?: boolean
}

type Props<T> = {
  rows: T[] | null
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  empty?: { title: string; description?: string }
  pageSize?: number
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
}

export function DataTable<T>({ rows, columns, rowKey, onRowClick, loading, error, onRetry, empty, pageSize = 12, defaultSort }: Props<T>) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!rows) return []
    const column = columns.find(item => item.key === sort?.key)
    if (!column?.sort) return rows
    const sign = sort!.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const left = column.sort!(a), right = column.sort!(b)
      return left > right ? sign : left < right ? -sign : 0
    })
  }, [rows, columns, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => setPage(current => Math.min(current, pages - 1)), [pages])
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize)

  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (loading && !rows) return <Rows />
  if (!sorted.length) return <Empty title={empty?.title ?? 'Nothing here yet'} description={empty?.description} />

  const toggle = (column: Column<T>) => {
    if (!column.sort) return
    setSort(current => (current?.key === column.key ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key: column.key, direction: 'desc' }))
  }

  const [lead, ...rest] = columns

  const activate = (row: T) => (event: React.MouseEvent | React.KeyboardEvent) => {
    if (!onRowClick || (event.target as HTMLElement).closest('button, a, select, input, textarea')) return
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onRowClick(row)
  }

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line">
              {columns.map(column => (
                <th key={column.key} scope="col" className={cn('whitespace-nowrap px-4 py-3 text-[12.5px] font-semibold text-muted first:pl-5 last:pr-5', column.align === 'right' && 'text-right', column.className)}>
                  {column.sort ? (
                    <button type="button" onClick={() => toggle(column)} className={cn('inline-flex items-center gap-1 hover:text-fg', sort?.key === column.key && 'text-fg')}>
                      {column.header}
                      {sort?.key === column.key ? sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr
                key={rowKey(row)}
                onClick={activate(row)}
                className={cn('border-b border-line/70 transition-colors last:border-0', onRowClick && 'cursor-pointer hover:bg-subtle/70')}
              >
                {columns.map(column => (
                  <td key={column.key} className={cn('px-4 py-3 align-middle first:pl-5 last:pr-5', column.align === 'right' && 'tabular whitespace-nowrap text-right', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {visible.map(row => (
          <li key={rowKey(row)}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={activate(row)}
              onKeyDown={activate(row)}
              className={cn('px-4 py-3.5 transition-colors', onRowClick && 'cursor-pointer active:bg-subtle')}
            >
              <div className="min-w-0 text-[14px]">{lead.cell(row)}</div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                {rest
                  .filter(column => column.mobile !== false)
                  .map(column => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[11.5px] font-semibold text-faint">{column.header}</dt>
                      <dd className="mt-0.5 min-w-0 truncate text-[13px]">{column.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted sm:px-5">
        <span className="tabular">
          {num(page * pageSize + 1)} to {num(Math.min(sorted.length, (page + 1) * pageSize))} of {num(sorted.length)}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular px-1">
            {page + 1} / {pages}
          </span>
          <Button variant="ghost" size="icon" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
