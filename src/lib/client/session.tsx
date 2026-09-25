'use client'
import { onIdTokenChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEMO_MODE } from '@/lib/env'
import { can, type Capability, type StaffRole } from '@/lib/roles'
import { api } from './api'
import { auth } from './firebase'

export type Staff = { uid: string; email: string; name: string; role: StaffRole }

type Session = {
  staff: Staff | null
  status: 'loading' | 'signed-out' | 'denied' | 'ready'
  error: string | null
  can: (capability: Capability) => boolean
  signOut: () => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [status, setStatus] = useState<Session['status']>('loading')
  const [error, setError] = useState<string | null>(null)

  const resolve = useCallback(async () => {
    try {
      const result = await api<{ staff: Staff }>('/api/session')
      setStaff(result.staff)
      setStatus('ready')
      setError(null)
    } catch (reason) {
      setStaff(null)
      setStatus('denied')
      setError(reason instanceof Error ? reason.message : 'Access denied')
    }
  }, [])

  useEffect(() => {
    if (DEMO_MODE) {
      void resolve()
      return
    }
    if (!auth) {
      setStatus('signed-out')
      setError('Sign in is not available right now. Please try again later.')
      return
    }
    return onIdTokenChanged(auth, user => {
      if (!user) {
        setStaff(null)
        setStatus('signed-out')
        return
      }
      void resolve()
    })
  }, [resolve])

  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth)
    setStaff(null)
    setStatus('signed-out')
  }, [])

  return <SessionContext.Provider value={{ staff, status, error, can: capability => can(staff?.role, capability), signOut }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside SessionProvider')
  return session
}
