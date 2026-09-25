import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { getStorage } from 'firebase-admin/storage'

function app(): App {
  const existing = getApps()[0]
  if (existing) return existing
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId) throw new Error('Firebase Admin is not configured')
  return initializeApp({
    credential: clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault(),
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  })
}

export function firebase() {
  const instance = app()
  return { auth: getAuth(instance), db: getFirestore(instance), messaging: getMessaging(instance), storage: getStorage(instance) }
}
