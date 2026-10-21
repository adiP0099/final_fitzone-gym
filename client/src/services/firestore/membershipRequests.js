import {
  Timestamp,
  collection,
  doc,
  orderBy,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import {
  assertOptionalString,
  assertString,
  requireAdmin,
  requireUser,
  runWrite,
  watchAfterAuth,
  watchCollection,
  watchCollectionGroup,
} from './core.js'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const REVIEWED_STATUSES = ['approved', 'rejected']

function planSnapshot(plan) {
  return {
    name: plan.name,
    description: plan.description,
    durationDays: plan.durationDays,
    priceMinor: plan.priceMinor,
    currency: plan.currency,
    benefits: plan.benefits,
  }
}

function validatePlan(plan) {
  if (!plan || plan.active !== true) {
    const error = new Error('This membership plan is no longer available.')
    error.code = 'firestore/plan-unavailable'
    throw error
  }
  if (
    typeof plan.name !== 'string'
    || typeof plan.description !== 'string'
    || !Number.isInteger(plan.durationDays)
    || plan.durationDays < 1
    || plan.durationDays > 36500
    || !Number.isSafeInteger(plan.priceMinor)
    || plan.priceMinor < 0
    || typeof plan.currency !== 'string'
    || !Array.isArray(plan.benefits)
    || plan.benefits.length > 30
    || plan.benefits.some((benefit) => typeof benefit !== 'string' || benefit.length > 300)
  ) {
    const error = new Error('The membership plan has invalid or incomplete details.')
    error.code = 'firestore/invalid-plan'
    throw error
  }
}

export function createMembershipRequestService({ db, auth }) {
  return {
    createMyRequest(planId) {
      const user = requireUser(auth)
      const selectedPlanId = assertString(planId, 'Plan ID', { maxLength: 150 })
      const requestsRef = collection(db, 'users', user.uid, 'membershipRequests')
      const requestRef = doc(requestsRef, selectedPlanId)
      const membershipRef = doc(collection(db, 'memberships'))

      return runWrite('submit membership request', async () => {
        const planRef = doc(db, 'membershipPlans', selectedPlanId)
        const profileRef = doc(db, 'users', user.uid)
        return runTransaction(db, async (transaction) => {
          const requestSnapshot = await transaction.get(requestRef)
          if (requestSnapshot.exists()) {
            const status = requestSnapshot.data().status
            if (status === 'pending_review') return { status: 'duplicate', requestId: requestRef.id }
            if (status === 'approved') return { status: 'already-approved' }
            if (status === 'rejected') return { status: 'already-rejected' }
            const error = new Error('A request record already exists for this plan and cannot be changed.')
            error.code = 'firestore/inconsistent-request'
            throw error
          }

          const [planSnapshotResult, profileSnapshot] = await Promise.all([
            transaction.get(planRef),
            transaction.get(profileRef),
          ])
          if (!planSnapshotResult.exists()) {
            const error = new Error('This membership plan could not be found.')
            error.code = 'firestore/plan-unavailable'
            throw error
          }

          const plan = planSnapshotResult.data()
          validatePlan(plan)
          if (!profileSnapshot.exists()) {
            const error = new Error('Create your member profile before requesting a membership.')
            error.code = 'firestore/profile-required'
            throw error
          }

          const memberName = assertString(profileSnapshot.data().displayName, 'Member name', { maxLength: 100 })
          const memberEmail = assertString(user.email, 'Account email', { maxLength: 254 })
          transaction.set(requestRef, {
            memberUid: user.uid,
            memberName,
            memberEmail,
            planId: selectedPlanId,
            planSnapshot: planSnapshot(plan),
            membershipId: membershipRef.id,
            status: 'pending_review',
            requestedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          return { status: 'created', requestId: requestRef.id }
        })
      })
    },

    watchMyRequests(callback) {
      const user = requireUser(auth)
      return watchCollection({
        db,
        path: `users/${user.uid}/membershipRequests`,
        constraints: [orderBy('requestedAt', 'desc')],
        callback,
      })
    },

    watchPendingForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollectionGroup({
          db,
          path: 'membershipRequests',
          constraints: [where('status', '==', 'pending_review')],
          callback: next,
        }),
        callback,
        operation: 'verify administrator access',
      })
    },

    reviewRequestForAdmin({ memberUid, requestId, decision, rejectionReason = '' }) {
      return requireAdmin(auth).then((admin) => {
        const uid = assertString(memberUid, 'Member UID', { maxLength: 128 })
        const id = assertString(requestId, 'Request ID', { maxLength: 150 })
        if (!REVIEWED_STATUSES.includes(decision)) {
          throw new TypeError('Request decision must be approved or rejected.')
        }
        const reason = assertOptionalString(rejectionReason, 'Rejection reason', 1000)
        if (decision === 'approved' && reason) {
          throw new TypeError('An approval cannot include a rejection reason.')
        }

        const requestRef = doc(db, 'users', uid, 'membershipRequests', id)
        return runWrite(`review membership request as ${decision}`, () => runTransaction(db, async (transaction) => {
          const requestSnapshot = await transaction.get(requestRef)
          if (!requestSnapshot.exists()) {
            const error = new Error('This membership request no longer exists.')
            error.code = 'firestore/request-not-found'
            throw error
          }

          const request = requestSnapshot.data()
          if (request.status !== 'pending_review') return { status: 'already-reviewed' }

          const membershipRef = doc(db, 'memberships', request.membershipId)
          const membershipSnapshot = await transaction.get(membershipRef)
          if (membershipSnapshot.exists()) {
            const error = new Error('A membership already exists for this request; no changes were made.')
            error.code = 'firestore/inconsistent-request'
            throw error
          }

          const review = {
            status: decision,
            reviewedByUid: admin.uid,
            reviewedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }

          if (decision === 'rejected') {
            if (reason) review.rejectionReason = reason
            transaction.update(requestRef, review)
            return { status: 'rejected' }
          }

          const startTime = Date.now()
          const endAt = Timestamp.fromMillis(
            startTime + request.planSnapshot.durationDays * DAY_IN_MILLISECONDS,
          )
          transaction.set(membershipRef, {
            memberUid: uid,
            planId: request.planId,
            planName: request.planSnapshot.name,
            requestId: id,
            startAt: serverTimestamp(),
            endAt,
            status: 'active',
            paymentStatus: 'unpaid',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          transaction.update(requestRef, review)
          return { status: 'approved', membershipId: request.membershipId }
        }))
      })
    },
  }
}
