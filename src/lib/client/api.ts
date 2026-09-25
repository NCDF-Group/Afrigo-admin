'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEMO_MODE } from '@/lib/env'
import { auth } from './firebase'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function authHeaders(): Promise<Record<string, string>> {
  if (DEMO_MODE) return {}
  const user = auth?.currentUser
  if (!user) throw new ApiError(401, 'Your session expired. Sign in again.')
  return { Authorization: `Bearer ${await user.getIdToken()}` }
}

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init
  const headers: Record<string, string> = { ...(await authHeaders()), ...(rest.headers as Record<string, string>) }
  if (json !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(path, { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body, cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) throw new ApiError(response.status, data.error || 'Request failed')
  return data as T
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const version = useRef(0)

  const load = useCallback(async () => {
    if (!path) return
    const current = ++version.current
    setLoading(true)
    try {
      const result = await api<T>(path)
      if (current === version.current) {
        setData(result)
        setError(null)
      }
    } catch (reason) {
      if (current === version.current) setError(reason instanceof Error ? reason.message : 'Something went wrong')
    } finally {
      if (current === version.current) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    setData(null)
    setError(null)
    void load()
  }, [load])

  return { data, error, loading, reload: load, setData }
}
