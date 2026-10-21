import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`)

if (missingConfig.length > 0) {
  throw new Error(`Missing Firebase configuration: ${missingConfig.join(', ')}. Set these values in client/.env.local.`)
}

const app = getApps().find((existingApp) => existingApp.name === '[DEFAULT]')
  ?? initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
