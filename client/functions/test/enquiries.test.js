import assert from 'node:assert/strict'
import test from 'node:test'
import { initializeApp as initializeClientApp, deleteApp } from 'firebase/app'
import { getApps, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { createEnquiryService } from '../../src/services/firestore/enquiries.js'
import { validateEnquiry } from '../src/validation.js'

const validInput = {
  name: 'Alex Johnson',
  email: 'alex@example.com',
  phone: '+1 (800) 555-3489',
  subject: 'General Inquiry',
  message: 'I would like to learn more about FitZone.',
}

test('validates and normalizes the allowed enquiry fields', () => {
  assert.deepEqual(validateEnquiry({ ...validInput, name: '  Alex Johnson  ' }), validInput)
})

test('rejects invalid email, phone, topic, oversized message, and forged fields', () => {
  assert.throws(() => validateEnquiry({ ...validInput, email: 'invalid' }), /valid email/)
  assert.throws(() => validateEnquiry({ ...validInput, phone: '123-45' }), /valid phone/)
  assert.throws(() => validateEnquiry({ ...validInput, subject: 'Other topic' }), /valid enquiry topic/)
  assert.throws(() => validateEnquiry({ ...validInput, message: 'x'.repeat(5001) }), /Message must be/)
  assert.throws(() => validateEnquiry({ ...validInput, status: 'resolved' }), /Unsupported enquiry fields/)
  assert.throws(() => validateEnquiry({ ...validInput, isRead: true }), /Unsupported enquiry fields/)
  assert.throws(() => validateEnquiry({ ...validInput, createdAt: new Date() }), /Unsupported enquiry fields/)
})

test('callable persists the validated enquiry with trusted initial state', async () => {
  const response = await fetch('http://127.0.0.1:5001/demo-fitzone-contact/us-central1/submitEnquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: validInput }),
  })
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.ok(result.result.id)

  const app = getApps()[0] || initializeApp({ projectId: 'demo-fitzone-contact' })
  const snapshot = await getFirestore(app).collection('enquiries').doc(result.result.id).get()
  const saved = snapshot.data()
  assert.equal(snapshot.exists, true)
  assert.deepEqual(
    Object.keys(saved).sort(),
    ['createdAt', 'email', 'isRead', 'message', 'name', 'phone', 'status', 'subject', 'updatedAt'].sort(),
  )
  assert.equal(saved.status, 'new')
  assert.equal(saved.isRead, false)
  assert.ok(saved.createdAt instanceof Timestamp)
  assert.ok(saved.updatedAt instanceof Timestamp)
  assert.equal(saved.email, validInput.email)
})

test('client enquiry service calls the regional callable and receives its document ID', async () => {
  const clientApp = initializeClientApp({
    apiKey: 'demo-api-key',
    appId: '1:123456789:web:abcdef',
    projectId: 'demo-fitzone-contact',
  }, 'contact-form-callable-test')

  try {
    const functions = getFunctions(clientApp, 'us-central1')
    connectFunctionsEmulator(functions, '127.0.0.1', 5001)
    const service = createEnquiryService({ db: null, auth: null, functions })

    const result = await service.submitEnquiry(validInput)
    assert.equal(typeof result.id, 'string')
    assert.ok(result.id.length > 0)
  } finally {
    await deleteApp(clientApp)
  }
})

test('callable rejects forged system fields without creating an enquiry', async () => {
  const response = await fetch('http://127.0.0.1:5001/demo-fitzone-contact/us-central1/submitEnquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { ...validInput, status: 'resolved' } }),
  })
  const result = await response.json()
  assert.equal(response.status, 400)
  assert.equal(result.error.status, 'INVALID_ARGUMENT')
})
