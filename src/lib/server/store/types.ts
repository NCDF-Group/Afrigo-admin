export type Doc = { id: string; [key: string]: any }

export type Operator = '==' | '!=' | 'in' | 'not-in' | 'array-contains' | '>' | '>=' | '<' | '<='

export type Filter = [field: string, op: Operator, value: unknown]

export type Query = { where?: Filter[]; orderBy?: [field: string, direction: 'asc' | 'desc']; limit?: number }

export type Write =
  | { type: 'set'; collection: string; id: string; data: Record<string, unknown>; merge?: boolean }
  | { type: 'update'; collection: string; id: string; data: Record<string, unknown> }
  | { type: 'add'; collection: string; data: Record<string, unknown> }

export interface Store {
  list(collection: string, query?: Query): Promise<Doc[]>
  get(collection: string, id: string): Promise<Doc | null>
  add(collection: string, data: Record<string, unknown>): Promise<string>
  set(collection: string, id: string, data: Record<string, unknown>, merge?: boolean): Promise<void>
  update(collection: string, id: string, data: Record<string, unknown>): Promise<void>
  commit(writes: Write[]): Promise<void>
  watch(collection: string, query: Query, listener: (docs: Doc[]) => void): () => void
}
