import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
} from 'firebase/firestore'

export class FirestoreServiceError extends Error {
  constructor(message, { code = 'firestore/service-error', cause } = {}) {
    super(message, { cause })
    this.name = 'FirestoreServiceError'
    this.code = code
  }
}

export function requireUser(auth) {
  if (!auth?.currentUser?.uid) {
    throw new FirestoreServiceError('Sign in is required for this operation.', {
      code: 'firestore/unauthenticated',
    })
  }
  return auth.currentUser
}

export function trustedWorkflowRequired(message) {
  return new FirestoreServiceError(message, {
    code: 'firestore/trusted-workflow-required',
  })
}

export async function requireAdmin(auth) {
  const user = requireUser(auth)
  try {
    const token = await user.getIdTokenResult()
    if (token.claims.role !== 'admin') {
      throw new FirestoreServiceError('This operation requires trusted administrator access.', {
        code: 'firestore/permission-denied',
      })
    }
  } catch (error) {
    if (error instanceof FirestoreServiceError) throw error
    throw toServiceError('verify administrator access', error)
  }
  return user
}

export function toServiceError(operation, cause) {
  if (cause instanceof FirestoreServiceError) return cause

  const code = cause?.code || 'firestore/request-failed'
  const fallbackMessage = `Unable to ${operation}. Please try again.`
  const message = typeof cause?.message === 'string' && cause.message.trim()
    ? `${cause.message}${code === 'firestore/request-failed' ? '' : ` (${code})`}`
    : fallbackMessage

  return new FirestoreServiceError(message, {
    code,
    cause,
  })
}

export function assertRecord(value, operation) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new FirestoreServiceError(`${operation} must be an object.`, {
      code: 'firestore/invalid-input',
    })
  }
  return value
}

export function assertString(value, field, { maxLength, minLength = 1 } = {}) {
  if (typeof value !== 'string') {
    throw new FirestoreServiceError(`${field} must be a string.`, {
      code: 'firestore/invalid-input',
    })
  }
  const normalized = value.trim()
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new FirestoreServiceError(`${field} must be between ${minLength} and ${maxLength} characters.`, {
      code: 'firestore/invalid-input',
    })
  }
  return normalized
}

export function assertOptionalString(value, field, maxLength) {
  if (value === undefined || value === null || value === '') return value
  return assertString(value, field, { maxLength })
}

export function assertOnlyFields(record, allowedFields, operation) {
  const unexpected = Object.keys(record).filter((key) => !allowedFields.includes(key))
  if (unexpected.length) {
    throw new FirestoreServiceError(`${operation} contains unsupported fields: ${unexpected.join(', ')}.`, {
      code: 'firestore/invalid-input',
    })
  }
}

function notify(callback, state) {
  callback(state)
}

function snapshotRecord(snapshot) {
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

function snapshotRecords(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export function watchDocument({ db, path, id, callback }) {
  notify(callback, { loading: true, data: null, empty: false, error: null })
  return onSnapshot(
    doc(db, path, id),
    (snapshot) => {
      const data = snapshotRecord(snapshot)
      notify(callback, { loading: false, data, empty: data === null, error: null })
    },
    (cause) => notify(callback, {
      loading: false,
      data: null,
      empty: false,
      error: toServiceError(`read ${path} record`, cause),
    }),
  )
}

export function watchCollection({ db, path, constraints = [], callback }) {
  notify(callback, { loading: true, data: null, empty: false, error: null })
  let lastData = null
  return onSnapshot(
    query(collection(db, path), ...constraints),
    (snapshot) => {
      lastData = snapshotRecords(snapshot)
      notify(callback, { loading: false, data: lastData, empty: lastData.length === 0, error: null })
    },
    (cause) => notify(callback, collectionWatchErrorState(path, lastData, cause)),
  )
}

export function collectionWatchErrorState(path, lastData, cause) {
  return {
    loading: false,
    data: lastData,
    empty: lastData !== null && lastData.length === 0,
    error: toServiceError(`read ${path}`, cause),
  }
}

export function watchCollectionGroup({ db, path, constraints = [], callback }) {
  notify(callback, { loading: true, data: null, empty: false, error: null })
  return onSnapshot(
    query(collectionGroup(db, path), ...constraints),
    (snapshot) => {
      const data = snapshotRecords(snapshot)
      notify(callback, { loading: false, data, empty: data.length === 0, error: null })
    },
    (cause) => notify(callback, {
      loading: false,
      data: null,
      empty: false,
      error: toServiceError(`read ${path}`, cause),
    }),
  )
}

export async function readDocument({ db, path, id }) {
  try {
    const snapshot = await getDoc(doc(db, path, id))
    const data = snapshotRecord(snapshot)
    return { data, empty: data === null }
  } catch (cause) {
    throw toServiceError(`read ${path} record`, cause)
  }
}

export async function readCollection({ db, path, constraints = [] }) {
  try {
    const snapshot = await getDocs(query(collection(db, path), ...constraints))
    const data = snapshotRecords(snapshot)
    return { data, empty: data.length === 0 }
  } catch (cause) {
    throw toServiceError(`read ${path}`, cause)
  }
}

export function runWrite(operation, callback) {
  try {
    return Promise.resolve(callback()).catch((cause) => {
      throw toServiceError(operation, cause)
    })
  } catch (cause) {
    return Promise.reject(toServiceError(operation, cause))
  }
}

export function watchAfterAuth({ authorize, subscribe, callback, operation }) {
  let active = true
  let unsubscribe = () => {}
  notify(callback, { loading: true, data: null, empty: false, error: null })

  Promise.resolve()
    .then(authorize)
    .then(() => {
      if (!active) return
      unsubscribe = subscribe((state) => {
        if (active) notify(callback, state)
      })
    })
    .catch((cause) => {
      if (!active) return
      notify(callback, {
        loading: false,
        data: null,
        empty: false,
        error: toServiceError(operation, cause),
      })
    })

  return () => {
    active = false
    unsubscribe()
  }
}
