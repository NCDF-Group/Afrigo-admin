import type { MapMetric } from '@/components/map/africa-map'
import { num, usd } from './format'

export const MAP_METRICS: MapMetric[] = [
  { key: 'users', label: 'Members', value: stat => stat.users, format: num },
  { key: 'activeNow', label: 'Active now', value: stat => stat.activeNow, format: num },
  { key: 'trades', label: 'Trades', value: stat => stat.trades, format: num },
  { key: 'exports', label: 'Export value', value: stat => stat.exportsUsd, format: value => usd(value) },
  { key: 'imports', label: 'Import value', value: stat => stat.importsUsd, format: value => usd(value) },
  { key: 'listings', label: 'Live listings', value: stat => stat.listings, format: num },
  { key: 'signups', label: 'Signups this week', value: stat => stat.signups7d, format: num }
]
