import 'server-only'
import { DEMO_MODE } from '@/lib/env'
import { demoSeed, startDemoPulse } from './demo'
import { firestoreStore } from './firestore'
import { memoryStore } from './memory'
import type { Store } from './types'

export type { Doc, Filter, Query, Store, Write } from './types'

const global = globalThis as unknown as { afrigoStore?: Store; afrigoPulse?: ReturnType<typeof setInterval> }

export function store(): Store {
  if (global.afrigoStore) return global.afrigoStore
  if (DEMO_MODE) {
    const memory = memoryStore(demoSeed())
    global.afrigoPulse = startDemoPulse(memory)
    global.afrigoStore = memory
  } else {
    global.afrigoStore = firestoreStore()
  }
  return global.afrigoStore
}
