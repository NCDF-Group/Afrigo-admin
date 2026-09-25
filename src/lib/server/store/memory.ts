import { normalize } from './normalize'
import type { Doc, Filter, Query, Store, Write } from './types'

type Table = Map<string, Record<string, any>>
type Watcher = { collection: string; query: Query; listener: (docs: Doc[]) => void }

const read = (record: Record<string, any>, path: string) => path.split('.').reduce<any>((value, key) => value?.[key], record)

function assign(record: Record<string, any>, path: string, value: unknown) {
  const keys = path.split('.')
  let target = record
  for (const key of keys.slice(0, -1)) {
    if (typeof target[key] !== 'object' || target[key] === null) target[key] = {}
    target = target[key]
  }
  target[keys[keys.length - 1]] = value
}

function matches(record: Record<string, any>, [field, op, expected]: Filter) {
  const value = read(record, field)
  switch (op) {
    case '==':
      return value === expected
    case '!=':
      return value !== expected
    case 'in':
      return (expected as unknown[]).includes(value)
    case 'not-in':
      return !(expected as unknown[]).includes(value)
    case 'array-contains':
      return Array.isArray(value) && value.includes(expected)
    case '>':
      return value > (normalize(expected) as any)
    case '>=':
      return value >= (normalize(expected) as any)
    case '<':
      return value < (normalize(expected) as any)
    case '<=':
      return value <= (normalize(expected) as any)
  }
}

let counter = 0
const newId = () => `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 8)}`

export function memoryStore(seed: Record<string, Doc[]>): Store & { snapshot: (collection: string) => Doc[] } {
  const tables = new Map<string, Table>()
  const watchers = new Set<Watcher>()
  let pending = new Set<string>()
  let scheduled = false

  for (const [collection, docs] of Object.entries(seed)) {
    tables.set(collection, new Map(docs.map(({ id, ...data }) => [id, normalize(data)])))
  }

  const table = (collection: string) => {
    if (!tables.has(collection)) tables.set(collection, new Map())
    return tables.get(collection)!
  }

  function run(collection: string, query: Query = {}): Doc[] {
    let docs = [...table(collection).entries()].map(([id, data]) => ({ id, ...structuredClone(data) }))
    for (const filter of query.where ?? []) docs = docs.filter(doc => matches(doc, filter))
    if (query.orderBy) {
      const [field, direction] = query.orderBy
      const sign = direction === 'desc' ? -1 : 1
      docs.sort((a, b) => (read(a, field) > read(b, field) ? sign : read(a, field) < read(b, field) ? -sign : 0))
    }
    return query.limit ? docs.slice(0, query.limit) : docs
  }

  function touch(collection: string) {
    pending.add(collection)
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      const changed = pending
      pending = new Set()
      scheduled = false
      for (const watcher of watchers) if (changed.has(watcher.collection)) watcher.listener(run(watcher.collection, watcher.query))
    })
  }

  function apply(write: Write) {
    if (write.type === 'add') {
      table(write.collection).set(newId(), normalize(write.data))
    } else if (write.type === 'set') {
      const current = write.merge === false ? {} : table(write.collection).get(write.id) ?? {}
      const next = structuredClone(current)
      for (const [key, value] of Object.entries(normalize(write.data))) next[key] = value
      table(write.collection).set(write.id, next)
    } else {
      const current = table(write.collection).get(write.id)
      if (!current) throw new Error(`No document to update: ${write.collection}/${write.id}`)
      for (const [key, value] of Object.entries(write.data)) assign(current, key, normalize(value))
    }
    touch(write.collection)
  }

  return {
    snapshot: collection => run(collection),
    async list(collection, query) {
      return run(collection, query)
    },
    async get(collection, id) {
      const data = table(collection).get(id)
      return data ? { id, ...structuredClone(data) } : null
    },
    async add(collection, data) {
      const id = newId()
      table(collection).set(id, normalize(data))
      touch(collection)
      return id
    },
    async set(collection, id, data, merge = true) {
      apply({ type: 'set', collection, id, data, merge })
    },
    async update(collection, id, data) {
      apply({ type: 'update', collection, id, data })
    },
    async commit(writes) {
      for (const write of writes) if (write.type === 'update' && !table(write.collection).has(write.id)) throw new Error(`No document to update: ${write.collection}/${write.id}`)
      for (const write of writes) apply(write)
    },
    watch(collection, query, listener) {
      const watcher = { collection, query, listener }
      watchers.add(watcher)
      queueMicrotask(() => listener(run(collection, query)))
      return () => watchers.delete(watcher)
    }
  }
}
