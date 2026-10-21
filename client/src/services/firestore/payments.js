import { orderBy, where } from 'firebase/firestore'
import {
  readCollection,
  requireAdmin,
  requireUser,
  trustedWorkflowRequired,
  watchAfterAuth,
  watchCollection,
} from './core.js'

export function createPaymentService({ db, auth }) {
  return {
    getMyPayments() {
      const user = requireUser(auth)
      return readCollection({
        db,
        path: 'payments',
        constraints: [where('memberUid', '==', user.uid), orderBy('createdAt', 'desc')],
      })
    },

    watchMyPayments(callback) {
      const user = requireUser(auth)
      return watchCollection({
        db,
        path: 'payments',
        constraints: [where('memberUid', '==', user.uid), orderBy('createdAt', 'desc')],
        callback,
      })
    },

    getAllPaymentsForAdmin() {
      return requireAdmin(auth).then(() => readCollection({
        db,
        path: 'payments',
        constraints: [orderBy('createdAt', 'desc')],
      }))
    },

    watchAllPaymentsForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({
          db,
          path: 'payments',
          constraints: [orderBy('createdAt', 'desc')],
          callback: next,
        }),
        callback,
        operation: 'verify administrator access',
      })
    },

    recordPayment() {
      return Promise.reject(trustedWorkflowRequired('Payment records are read-only in the client. A trusted, verified payment process must record payment status.'))
    },

    markPaymentPaid() {
      return Promise.reject(trustedWorkflowRequired('A client cannot mark payments as paid. Only a trusted payment confirmation workflow may do so.'))
    },
  }
}
