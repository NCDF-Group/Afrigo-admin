'use client'
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { ArrowRight, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DEMO_MODE } from '@/lib/env'
import { auth, firebaseConfigured } from '@/lib/client/firebase'
import { useSession } from '@/lib/client/session'
import { SHAPES, MAP_VIEWBOX } from '@/lib/geo/shapes'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Logo } from '@/components/shell/logo'
import { ThemeToggle } from '@/components/shell/theme-toggle'

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password do not match.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
  'auth/user-disabled': 'This account has been disabled.'
}

export default function SignInPage() {
  const router = useRouter()
  const { status, error: sessionError } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'ready') router.replace('/')
    if (status === 'denied') setError(sessionError)
  }, [status, sessionError, router])

  const attempt = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (reason: any) {
      setError(MESSAGES[reason?.code] ?? reason?.message ?? 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  const unavailable = !DEMO_MODE && !firebaseConfigured

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#012A22] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,176,65,.28),transparent_45%),radial-gradient(circle_at_80%_90%,rgba(11,114,89,.55),transparent_50%)]" />
        <svg viewBox={MAP_VIEWBOX} className="absolute -right-20 top-1/2 h-[96%] -translate-y-1/2 opacity-[0.16]" aria-hidden>
          {SHAPES.map(shape => (shape.d ? <path key={shape.iso} d={shape.d} fill="#A8D176" stroke="#012A22" strokeWidth={1.2} /> : null))}
        </svg>
        <div className="relative">
          <img src="/brand/afrigo-lockup-light.svg" alt="Afrigo" className="h-8 w-auto" />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A8D176]">Operations console</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight">Run Afrigo across all 54 markets from one place.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">Live country statistics, verification, trades, payouts, and full control of the web, iOS and Android apps.</p>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">Staff sign in</h2>
          <p className="mt-1.5 text-sm text-muted">Use the Afrigo account that has been granted an operational role.</p>

          {DEMO_MODE ? (
            <div className="mt-8">
              <Button variant="primary" className="w-full" onClick={() => router.replace('/')}>
                Open the console <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={event => {
                event.preventDefault()
                if (auth) void attempt(() => signInWithEmailAndPassword(auth!, email.trim(), password))
              }}
            >
              <Field label="Work email">
                <Input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@afrigo.africa" />
              </Field>
              <Field label="Password">
                <Input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
              </Field>
              {error ? <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p> : null}
              {notice ? <p className="rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">{notice}</p> : null}
              {unavailable ? <p className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning">Sign in is not available right now. Please try again later.</p> : null}
              <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={unavailable}>
                Sign in
              </Button>
              <div className="flex items-center gap-3 py-1 text-xs text-faint">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button type="button" className="w-full" disabled={busy || unavailable} onClick={() => auth && void attempt(() => signInWithPopup(auth!, new GoogleAuthProvider()))}>
                Continue with Google
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm font-semibold text-muted hover:text-fg"
                onClick={() => {
                  if (!email.trim()) return setError('Enter your email first, then request a reset link.')
                  if (auth) void attempt(async () => {
                    await sendPasswordResetEmail(auth!, email.trim())
                    setNotice('If that account exists, a reset link is on its way.')
                  })
                }}
              >
                Forgot your password?
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-faint">Access is logged and audited.</p>
      </main>
    </div>
  )
}
