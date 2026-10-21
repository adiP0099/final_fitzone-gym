export async function verifyAdminClaim(user) {
  const tokenResult = await user.getIdTokenResult(true)
  return tokenResult?.claims?.role === 'admin'
}

export function getSavedDestination(destination) {
  if (
    !destination
    || typeof destination.pathname !== 'string'
    || !destination.pathname.startsWith('/')
    || destination.pathname.startsWith('//')
  ) {
    return null
  }

  return {
    pathname: destination.pathname,
    search: destination.search,
    hash: destination.hash,
  }
}

export function getDefaultLoginDestination(isAdmin) {
  return isAdmin ? '/admin' : '/member'
}

export function getAdminGuardDecision({ loading, user, authorization }) {
  if (loading) return 'loading'
  if (!user) return 'signed-out'
  if (!authorization || authorization.user !== user || authorization.status === 'checking') {
    return 'checking'
  }
  if (authorization.status === 'error') return 'error'
  if (authorization.status === 'unauthorized') return 'unauthorized'
  if (authorization.status === 'authorized') return 'authorized'
  return 'checking'
}
