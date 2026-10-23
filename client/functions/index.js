import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { validateEnquiry } from './src/validation.js'

if (!getApps().length) initializeApp()

export const submitEnquiry = onCall({
  region: 'us-central1',
  maxInstances: 5,
}, async (request) => {
  let enquiry
  try {
    enquiry = validateEnquiry(request.data)
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message)
  }

  try {
    const reference = await getFirestore().collection('enquiries').add({
      ...enquiry,
      status: 'new',
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { id: reference.id }
  } catch {
    throw new HttpsError('unavailable', 'Your message could not be saved. Please try again.')
  }
})
