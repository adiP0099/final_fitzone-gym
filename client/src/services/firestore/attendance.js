import { orderBy, where } from 'firebase/firestore'
import {
  readCollection,
  requireAdmin,
  requireUser,
  trustedWorkflowRequired,
  watchAfterAuth,
  watchCollection,
} from './core.js'

export function createAttendanceService({ db, auth }) {
  return {
    getMyAttendance() {
      const user = requireUser(auth)
      return readCollection({
        db,
        path: 'attendance',
        constraints: [where('memberUid', '==', user.uid), orderBy('checkInAt', 'desc')],
      })
    },

    watchMyAttendance(callback) {
      const user = requireUser(auth)
      return watchCollection({
        db,
        path: 'attendance',
        constraints: [where('memberUid', '==', user.uid), orderBy('checkInAt', 'desc')],
        callback,
      })
    },

    getAllAttendanceForAdmin() {
      return requireAdmin(auth).then(() => readCollection({
        db,
        path: 'attendance',
        constraints: [orderBy('checkInAt', 'desc')],
      }))
    },

    watchAllAttendanceForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({
          db,
          path: 'attendance',
          constraints: [orderBy('checkInAt', 'desc')],
          callback: next,
        }),
        callback,
        operation: 'verify administrator access',
      })
    },

    createAttendance() {
      return Promise.reject(trustedWorkflowRequired('Attendance writes require a trusted check-in workflow; direct client writes are denied by Firestore rules.'))
    },
  }
}
