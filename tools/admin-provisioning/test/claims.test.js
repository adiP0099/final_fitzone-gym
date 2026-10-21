import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseArguments, updateRoleClaim } from '../claims.js'

test('grant sets admin role and preserves other custom claims', () => {
  const current = { department: 'operations', featureFlag: true }
  const updated = updateRoleClaim('grant', current)

  assert.deepEqual(updated, { department: 'operations', featureFlag: true, role: 'admin' })
  assert.deepEqual(current, { department: 'operations', featureFlag: true })
})

test('revoke removes only the role claim', () => {
  assert.deepEqual(
    updateRoleClaim('revoke', { department: 'operations', role: 'admin' }),
    { department: 'operations' },
  )
})

test('claim utility rejects invalid actions and claim data', () => {
  assert.throws(() => updateRoleClaim('promote', {}), /Action must be grant or revoke/)
  assert.throws(() => updateRoleClaim('grant', []), /must be an object/)
})

test('arguments require explicit action, project, and UID', () => {
  assert.deepEqual(
    parseArguments(['--action', 'grant', '--project', 'fitzone-b67b2', '--uid', 'target-auth-uid']),
    { action: 'grant', project: 'fitzone-b67b2', uid: 'target-auth-uid' },
  )
  assert.throws(
    () => parseArguments(['--action', 'grant', '--project', 'another-project', '--uid', 'target-auth-uid']),
    /project must be explicitly set/,
  )
  assert.throws(
    () => parseArguments(['--action', 'grant', '--project', 'fitzone-b67b2']),
    /UID/,
  )
  assert.throws(
    () => parseArguments(['--action', 'grant', '--project', 'fitzone-b67b2', '--uid', 'bad/uid']),
    /valid Firebase Authentication UID/,
  )
})
