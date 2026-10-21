import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getAdminGuardDecision, verifyAdminClaim } from './adminAuthorization.js'

export default function RequireAuth({ adminOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [authorization, setAuthorization] = useState(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!adminOnly || loading || !user) return undefined

    let active = true
    setAuthorization({ user, status: 'checking' })
    verifyAdminClaim(user)
      .then((isAdmin) => {
        if (active) setAuthorization({ user, status: isAdmin ? 'authorized' : 'unauthorized' })
      })
      .catch((error) => {
        if (active) setAuthorization({ user, status: 'error', error })
      })

    return () => {
      active = false
    }
  }, [adminOnly, loading, user, retry])

  const adminDecision = adminOnly
    ? getAdminGuardDecision({ loading, user, authorization })
    : loading
      ? 'loading'
      : user
        ? 'authorized'
        : 'signed-out'

  if (adminDecision === 'loading' || adminDecision === 'checking') {
    return <main className="auth-loading" aria-busy="true" aria-live="polite">
      <span className="auth-loading-indicator" aria-hidden="true" />
      <p>{adminDecision === 'loading' ? 'Restoring your FitZone session…' : 'Verifying administrator access…'}</p>
    </main>
  }

  if (adminDecision === 'signed-out') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminDecision === 'unauthorized') {
    return <Navigate to="/member" replace state={{ from: location, authorizationRequired: 'admin' }} />
  }

  if (adminDecision === 'error') {
    return <main className="auth-loading" aria-live="polite">
      <p role="alert">Administrator access could not be verified. Check your connection and retry, or sign in again.</p>
      <button className="button button-outline" type="button" onClick={() => {
        setAuthorization(null)
        setRetry((attempt) => attempt + 1)
      }}>Retry verification</button>
      <Link className="button button-quiet" to="/login" state={{ from: location }}>Return to sign in</Link>
    </main>
  }

  return <Outlet />
}
