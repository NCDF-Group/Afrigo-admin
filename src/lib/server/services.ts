import 'server-only'
import { DEMO_MODE } from '@/lib/env'
import { firebase } from './firebase'
import { fail } from './http'

export type AuthAccount = { uid: string; email: string; emailVerified: boolean; displayName: string; claims: Record<string, unknown> }

export async function findAccount(email: string): Promise<AuthAccount> {
  if (DEMO_MODE) return { uid: `staff_${email.replace(/[^a-z0-9]/gi, '')}`, email, emailVerified: true, displayName: email.split('@')[0], claims: {} }
  try {
    const account = await firebase().auth.getUserByEmail(email)
    return { uid: account.uid, email, emailVerified: account.emailVerified, displayName: account.displayName || '', claims: account.customClaims || {} }
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') fail(404, 'No Afrigo account exists for that email.')
    throw error
  }
}

export async function setClaims(uid: string, claims: Record<string, unknown>) {
  if (DEMO_MODE) return
  await firebase().auth.setCustomUserClaims(uid, claims)
}

export async function revokeSessions(uid: string) {
  if (DEMO_MODE) return
  await firebase().auth.revokeRefreshTokens(uid)
}

export async function setAccountDisabled(uid: string, disabled: boolean) {
  if (DEMO_MODE) return
  await firebase().auth.updateUser(uid, { disabled })
  if (disabled) await firebase().auth.revokeRefreshTokens(uid)
}

export async function signedDocumentUrl(path: string) {
  if (DEMO_MODE) return null
  const [url] = await firebase().storage.bucket().file(path).getSignedUrl({ action: 'read', expires: Date.now() + 10 * 60_000 })
  return url
}

export async function pushToTokens(tokens: string[], message: { title: string; body: string; link?: string }) {
  if (!tokens.length) return { delivered: 0, failed: 0 }
  if (DEMO_MODE) {
    const failed = Math.round(tokens.length * 0.03)
    return { delivered: tokens.length - failed, failed }
  }
  let delivered = 0, failed = 0
  for (let index = 0; index < tokens.length; index += 500) {
    const result = await firebase().messaging.sendEachForMulticast({
      tokens: tokens.slice(index, index + 500),
      notification: { title: message.title, body: message.body },
      data: message.link ? { link: message.link } : undefined,
      webpush: message.link ? { fcmOptions: { link: message.link } } : undefined,
      apns: { payload: { aps: { sound: 'default' } } },
      android: { priority: 'high' }
    })
    delivered += result.successCount
    failed += result.failureCount
  }
  return { delivered, failed }
}

export async function paystackRefund(input: { reference: string; amount: number; currency: string; note: string }) {
  if (DEMO_MODE) return { id: `demo-refund-${Date.now()}` }
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) fail(503, 'The refund provider is not configured.')
  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: input.reference, amount: Math.round(input.amount * 100), currency: input.currency, customer_note: input.note.slice(0, 255) })
  })
  const result = await response.json()
  if (!response.ok || !result.status) fail(422, result.message || 'Refund execution failed')
  return { id: result.data?.id ?? null }
}
