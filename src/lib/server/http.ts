import 'server-only'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const fail = (status: number, message: string): never => {
  throw new HttpError(status, message)
}

export const text = (value: unknown, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

export const safeId = (value: unknown) => text(value, 180).replace(/[^a-zA-Z0-9_-]/g, '')

export async function body<T = Record<string, any>>(request: Request): Promise<T> {
  return (await request.json().catch(() => ({}))) as T
}

export function handle<C = unknown>(handler: (request: Request, context: C) => Promise<unknown>) {
  return async (request: Request, context: C) => {
    try {
      const result = await handler(request, context)
      return result instanceof Response ? result : Response.json({ ok: true, ...(result as object) })
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ ok: false, error: error.message }, { status: error.status })
      console.error(error)
      return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
    }
  }
}

const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return
  }
  if (++bucket.count > limit) fail(429, 'Too many requests. Slow down and try again shortly.')
}
