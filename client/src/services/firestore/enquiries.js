import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import {
  assertString,
  readCollection,
  requireAdmin,
  runWrite,
  toServiceError,
  trustedWorkflowRequired,
  watchAfterAuth,
  watchCollection,
} from './core.js'

const enquiryStatuses = ['new', 'in_review', 'resolved']

export function createEnquiryService({ db, auth }) {
  return {
    getEnquiriesForAdmin() {
      return requireAdmin(auth).then(() => readCollection({
        db,
        path: 'enquiries',
        constraints: [orderBy('createdAt', 'desc')],
      }))
    },

    watchEnquiriesForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({
          db,
          path: 'enquiries',
          constraints: [orderBy('createdAt', 'desc')],
          callback: next,
        }),
        callback,
        operation: 'verify administrator access',
      })
    },

    updateEnquiryStatusForAdmin(enquiryId, status) {
      return requireAdmin(auth).then(() => {
        const id = assertString(enquiryId, 'Enquiry ID', { maxLength: 150 })
        if (!enquiryStatuses.includes(status)) throw new TypeError('Enquiry status is invalid.')
        return runWrite('update enquiry status', () => updateDoc(doc(db, 'enquiries', id), {
          status,
          updatedAt: serverTimestamp(),
        }))
      })
    },

    submitEnquiry() {
      return Promise.reject(trustedWorkflowRequired('Enquiry creation is denied by Firestore rules; it requires a trusted submission endpoint.'))
    },

    getEnquiriesByStatusForAdmin(status) {
      return requireAdmin(auth).then(async () => {
        if (!enquiryStatuses.includes(status)) throw new TypeError('Enquiry status is invalid.')
        try {
          const result = await getDocs(query(
            collection(db, 'enquiries'),
            where('status', '==', status),
            orderBy('createdAt', 'desc'),
          ))
          const data = result.docs.map((item) => ({ id: item.id, ...item.data() }))
          return { data, empty: data.length === 0 }
        } catch (cause) {
          throw toServiceError('read enquiries', cause)
        }
      })
    },
  }
}
