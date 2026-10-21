import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase/config.js'
import { userProfiles } from '../services/firestore/index.js'

const AuthContext = createContext(null)

const authErrorMessages = {
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-credential': 'The email or password is incorrect. Check your details and try again.',
  'auth/invalid-api-key': 'Firebase sign-in is misconfigured. Check the local Firebase Web App configuration.',
  'auth/app-not-authorized': 'This app is not authorized for Firebase sign-in. Check the Firebase project settings.',
  'auth/user-not-found': 'The email or password is incorrect. Check your details and try again.',
  'auth/wrong-password': 'The email or password is incorrect. Check your details and try again.',
  'auth/user-disabled': 'This account has been disabled. Contact the gym for help.',
  'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
  'auth/operation-not-allowed': 'Email and password sign-in is not enabled for this Firebase project.',
  'auth/network-request-failed': 'A network error interrupted the request. Check your connection and try again.',
  'auth/too-many-requests': 'There have been too many attempts. Wait a little while and try again.',
  'auth/unauthorized-domain': 'This website is not authorized for Firebase sign-in. Check the Firebase authorized domains.',
  'auth/profile-update-failed': 'Your account was created and signed in, but the display name could not be saved. You can continue to the member area.',
  'permission-denied': 'Your account was created, but Firestore denied saving its profile. Ask the project administrator to verify the deployed Firestore rules.',
  'firestore/permission-denied': 'Your account was created, but Firestore denied saving its profile. Ask the project administrator to verify the deployed Firestore rules.',
}

export function getAuthErrorMessage(error) {
  if (error?.code && authErrorMessages[error.code]) {
    return authErrorMessages[error.code]
  }

  return 'We could not complete that request. Please try again.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [initializationError, setInitializationError] = useState('')

  useEffect(() => onAuthStateChanged(
    auth,
    (authenticatedUser) => {
      setUser(authenticatedUser)
      setLoading(false)
    },
    (error) => {
      setInitializationError(getAuthErrorMessage(error))
      setLoading(false)
    },
  ), [])

  async function register(name, email, password) {
    setBusy(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      setUser(credential.user)

      try {
        await updateProfile(credential.user, { displayName: name })
      } catch (cause) {
        const error = new Error('The account was created, but the display name could not be saved.')
        error.code = 'auth/profile-update-failed'
        error.cause = cause
        throw error
      }

      try {
        await userProfiles.createMyProfile({ displayName: name })
      } catch (cause) {
        if (import.meta.env.DEV) {
          console.error('[FitZone] Member profile creation failed', {
            code: cause?.code || 'firestore/request-failed',
            message: cause?.message || 'No Firebase error message was provided.',
          })
        }
        const error = new Error('The account was created, but the member profile could not be saved. Please try again.')
        error.code = cause?.code || 'firestore/profile-create-failed'
        error.profileCreationFailed = true
        error.cause = cause
        throw error
      }

      setUser(credential.user)
      return credential.user
    } finally {
      setBusy(false)
    }
  }

  async function login(email, password) {
    setBusy(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      setUser(credential.user)
      return credential.user
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    try {
      await signOut(auth)
      setUser(null)
    } finally {
      setBusy(false)
    }
  }

  const value = useMemo(() => ({
    user,
    loading,
    busy,
    initializationError,
    register,
    login,
    logout,
  }), [user, loading, busy, initializationError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }
  return context
}
