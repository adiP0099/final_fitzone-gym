import {
  collection,
  doc,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  assertOnlyFields,
  assertRecord,
  assertString,
  readCollection,
  requireAdmin,
  requireUser,
  runWrite,
  trustedWorkflowRequired,
  watchAfterAuth,
  watchCollection,
} from './core.js'

const statuses = ['requested', 'confirmed', 'cancelled', 'completed']

function validateBooking(input, { allowMemberUid = false } = {}) {
  const booking = assertRecord(input, 'Booking')
  const allowed = ['memberUid', 'trainerId', 'bookingAt', 'status']
  assertOnlyFields(booking, allowMemberUid ? allowed : allowed.filter((field) => field !== 'memberUid'), 'Booking')
  const status = booking.status
  if (!statuses.includes(status)) throw new TypeError('Booking status is invalid.')
  if (!(booking.bookingAt instanceof Date) || Number.isNaN(booking.bookingAt.valueOf())) {
    throw new TypeError('Booking date and time must be a valid Date.')
  }
  const result = { bookingAt: booking.bookingAt, status }
  if (booking.trainerId !== undefined && booking.trainerId !== null && booking.trainerId !== '') {
    result.trainerId = assertString(booking.trainerId, 'Trainer ID', { maxLength: 150 })
  }
  if (allowMemberUid) result.memberUid = assertString(booking.memberUid, 'Member UID', { maxLength: 128 })
  return result
}

export function createBookingService({ db, auth }) {
  return {
    getMyBookings() {
      const user = requireUser(auth)
      return readCollection({
        db,
        path: 'bookings',
        constraints: [where('memberUid', '==', user.uid), orderBy('bookingAt', 'desc')],
      })
    },

    watchMyBookings(callback) {
      const user = requireUser(auth)
      return watchCollection({
        db,
        path: 'bookings',
        constraints: [where('memberUid', '==', user.uid), orderBy('bookingAt', 'desc')],
        callback,
      })
    },

    getAllBookingsForAdmin() {
      return requireAdmin(auth).then(() => readCollection({
        db,
        path: 'bookings',
        constraints: [orderBy('bookingAt', 'desc')],
      }))
    },

    watchAllBookingsForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({
          db,
          path: 'bookings',
          constraints: [orderBy('bookingAt', 'desc')],
          callback: next,
        }),
        callback,
        operation: 'verify administrator access',
      })
    },

    createBookingForAdmin(input) {
      return requireAdmin(auth).then(() => {
        const data = {
          ...validateBooking(input, { allowMemberUid: true }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        const bookingRef = doc(collection(db, 'bookings'))
        return runWrite('create booking', () => setDoc(bookingRef, data)).then(() => bookingRef.id)
      })
    },

    updateBookingForAdmin(bookingId, input) {
      return requireAdmin(auth).then(() => {
        const id = assertString(bookingId, 'Booking ID', { maxLength: 150 })
        const data = { ...validateBooking(input, { allowMemberUid: true }), updatedAt: serverTimestamp() }
        return runWrite('update booking', () => updateDoc(doc(db, 'bookings', id), data))
      })
    },

    createBooking() {
      return Promise.reject(trustedWorkflowRequired('Member booking writes are not enabled by the Firestore rules. Use a future trusted booking workflow.'))
    },
  }
}
