import { requireStaff } from '@/lib/server/auth'
import { HttpError } from '@/lib/server/http'
import { live } from '@/lib/server/live'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const encoder = new TextEncoder()
const LIFETIME = 4 * 60_000

export async function GET(request: Request) {
  try {
    await requireStaff(request, 'analytics:read')
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Unavailable' }, { status })
  }

  let cleanup = () => {}
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          cleanup()
        }
      }
      const unsubscribe = live().subscribe(snapshot => send(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`))
      const heartbeat = setInterval(() => send(': ping\n\n'), 20_000)
      const expiry = setTimeout(() => cleanup(), LIFETIME)
      cleanup = () => {
        if (closed) return
        closed = true
        unsubscribe()
        clearInterval(heartbeat)
        clearTimeout(expiry)
        try {
          controller.close()
        } catch {}
      }
      request.signal.addEventListener('abort', () => cleanup())
      send('retry: 3000\n\n')
    },
    cancel() {
      cleanup()
    }
  })

  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' }
  })
}
