import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDefaultLoginDestination,
  getAdminGuardDecision,
  getSavedDestination,
  verifyAdminClaim,
} from '../src/routes/adminAuthorization.js'

test('login preserves a valid saved destination without requiring the default route', () => {
  assert.deepEqual(
    getSavedDestination({ pathname: '/admin/membership-requests', search: '?status=pending', hash: '#requests' }),
    { pathname: '/admin/membership-requests', search: '?status=pending', hash: '#requests' },
  )
  assert.equal(getSavedDestination({ pathname: 'https://example.com/admin' }), null)
  assert.equal(getSavedDestination({ pathname: '//example.com/admin' }), null)
})

test('default login destination follows only the verified admin-claim result', () => {
  assert.equal(getDefaultLoginDestination(true), '/admin')
  assert.equal(getDefaultLoginDestination(false), '/member')
})

test('admin route remains loading until Firebase auth restoration completes', () => {
  assert.equal(getAdminGuardDecision({
    loading: true,
    user: null,
    authorization: null,
  }), 'loading')
})

test('signed-out users are redirected instead of rendering an admin route', () => {
  assert.equal(getAdminGuardDecision({
    loading: false,
    user: null,
    authorization: null,
  }), 'signed-out')
})

test('signed-in members without the custom claim are unauthorized', async () => {
  const user = {
    uid: 'member-uid',
    getIdTokenResult: async (forceRefresh) => {
      assert.equal(forceRefresh, true)
      return { claims: { role: 'member' } }
    },
  }

  const isAdmin = await verifyAdminClaim(user)
  assert.equal(isAdmin, false)
  assert.equal(getAdminGuardDecision({
    loading: false,
    user,
    authorization: { user, status: 'unauthorized' },
  }), 'unauthorized')
})

test('a profile role does not authorize a user without the token claim', async () => {
  const user = {
    uid: 'profile-admin-uid',
    profile: { role: 'admin' },
    getIdTokenResult: async () => ({ claims: {} }),
  }

  assert.equal(await verifyAdminClaim(user), false)
  assert.equal(getAdminGuardDecision({
    loading: false,
    user,
    authorization: { user, status: 'unauthorized' },
  }), 'unauthorized')
})

test('only the Firebase token custom claim authorizes the admin route', async () => {
  const user = {
    uid: 'trusted-admin-uid',
    role: 'member',
    getIdTokenResult: async () => ({ claims: { role: 'admin' } }),
  }

  assert.equal(await verifyAdminClaim(user), true)
  assert.equal(getAdminGuardDecision({
    loading: false,
    user,
    authorization: { user, status: 'authorized' },
  }), 'authorized')
})

test('authorization from a previous user cannot unlock the current user route', () => {
  const user = { uid: 'new-user' }
  assert.equal(getAdminGuardDecision({
    loading: false,
    user,
    authorization: { user: { uid: 'previous-admin' }, status: 'authorized' },
  }), 'checking')
})

test('token verification failures fail closed and can be shown for retry', async () => {
  const error = Object.assign(new Error('Token refresh failed.'), { code: 'auth/network-request-failed' })
  const user = {
    uid: 'admin-uid',
    getIdTokenResult: async () => { throw error },
  }

  await assert.rejects(verifyAdminClaim(user), { code: 'auth/network-request-failed' })
  assert.equal(getAdminGuardDecision({
    loading: false,
    user,
    authorization: { user, status: 'error', error },
  }), 'error')
})
