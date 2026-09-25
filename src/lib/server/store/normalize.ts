export function normalize(value: any): any {
  if (value === null || value === undefined) return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (Array.isArray(value)) return value.map(normalize)
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
  return value
}
