'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { LiveSnapshot } from '@/lib/types'
import { authHeaders } from './api'

export type LiveStatus = 'connecting' | 'live' | 'offline'

const LiveContext = createContext<{ snapshot: LiveSnapshot | null; status: LiveStatus }>({ snapshot: null, status: 'connecting' })

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    const controller = new AbortController()
    let attempt = 0

    const connect = async () => {
      while (!controller.signal.aborted) {
        try {
          const response = await fetch('/api/live', { headers: await authHeaders(), signal: controller.signal, cache: 'no-store' })
          if (!response.ok || !response.body) throw new Error(`Live stream unavailable (${response.status})`)
          const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
          let buffer = ''
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += value
            const frames = buffer.split('\n\n')
            buffer = frames.pop() ?? ''
            for (const frame of frames) {
              const data = frame
                .split('\n')
                .filter(line => line.startsWith('data: '))
                .map(line => line.slice(6))
                .join('')
              if (!data) continue
              setSnapshot(JSON.parse(data))
              setStatus('live')
              attempt = 0
            }
          }
        } catch {
          if (controller.signal.aborted) return
          setStatus('offline')
        }
        attempt++
        await new Promise(resolve => setTimeout(resolve, Math.min(15_000, 600 * 2 ** Math.min(attempt, 5))))
      }
    }

    void connect()
    return () => controller.abort()
  }, [])

  return <LiveContext.Provider value={{ snapshot, status }}>{children}</LiveContext.Provider>
}

export const useLive = () => useContext(LiveContext)
