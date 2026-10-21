export function updateRoleClaim(action, existingClaims = {}) {
  if (!existingClaims || typeof existingClaims !== 'object' || Array.isArray(existingClaims)) {
    throw new TypeError('Existing custom claims must be an object.')
  }

  const claims = { ...existingClaims }
  if (action === 'grant') {
    claims.role = 'admin'
    return claims
  }

  if (action === 'revoke') {
    delete claims.role
    return claims
  }

  throw new TypeError('Action must be grant or revoke.')
}

export function parseArguments(args) {
  const options = {}
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    if (!['--action', '--project', '--uid'].includes(flag) || options[flag]) {
      throw new TypeError(`Unexpected or duplicate argument: ${flag}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new TypeError(`A value is required for ${flag}.`)
    }
    options[flag] = value
    index += 1
  }

  const action = options['--action']
  const project = options['--project']
  const uid = options['--uid']
  if (!['grant', 'revoke'].includes(action)) {
    throw new TypeError('Specify --action grant or --action revoke.')
  }
  if (project !== 'fitzone-b67b2') {
    throw new TypeError('The project must be explicitly set to fitzone-b67b2.')
  }
  if (!uid || uid.trim() !== uid || uid.length > 128 || uid.includes('/')) {
    throw new TypeError('Specify a valid Firebase Authentication UID with --uid.')
  }

  return { action, project, uid }
}
