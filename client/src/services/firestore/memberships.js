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

function validatePlan(input) {
  const plan = assertRecord(input, 'Membership plan')
  const fields = ['name', 'description', 'durationDays', 'priceMinor', 'currency', 'benefits', 'active']
  assertOnlyFields(plan, fields, 'Membership plan')
  const validated = {
    name: assertString(plan.name, 'Plan name', { maxLength: 100 }),
    description: assertString(plan.description, 'Plan description', { maxLength: 2000 }),
    durationDays: plan.durationDays,
    priceMinor: plan.priceMinor,
    currency: assertString(plan.currency, 'Currency', { maxLength: 3 }),
    benefits: plan.benefits,
    active: plan.active,
  }
  if (!Number.isInteger(validated.durationDays) || validated.durationDays <= 0) {
    throw new TypeError('Plan duration must be a positive whole number of days.')
  }
  if (!Number.isSafeInteger(validated.priceMinor) || validated.priceMinor < 0) {
    throw new TypeError('Plan price must be a non-negative integer in minor currency units.')
  }
  if (!/^[A-Z]{3}$/.test(validated.currency)) {
    throw new TypeError('Currency must be a three-letter uppercase ISO code.')
  }
  if (!Array.isArray(validated.benefits) || validated.benefits.length > 30
    || validated.benefits.some((benefit) => typeof benefit !== 'string' || benefit.length > 300)) {
    throw new TypeError('Plan benefits must be up to 30 strings of at most 300 characters.')
  }
  if (typeof validated.active !== 'boolean') {
    throw new TypeError('Plan active status must be a boolean.')
  }
  return validated
}

export function createMembershipService({ db, auth }) {
  return {
    getActivePlans() {
      return readCollection({
        db,
        path: 'membershipPlans',
        constraints: [where('active', '==', true)],
      })
    },

    watchActivePlans(callback) {
      return watchCollection({
        db,
        path: 'membershipPlans',
        constraints: [where('active', '==', true)],
        callback,
      })
    },

    getAllPlansForAdmin() {
      return requireAdmin(auth).then(() => readCollection({ db, path: 'membershipPlans' }))
    },

    watchAllPlansForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({ db, path: 'membershipPlans', callback: next }),
        callback,
        operation: 'verify administrator access',
      })
    },

    createPlanForAdmin(input) {
      return requireAdmin(auth).then(() => {
        const data = {
          ...validatePlan(input),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        const planRef = doc(collection(db, 'membershipPlans'))
        return runWrite('create membership plan', () => setDoc(planRef, data)).then(() => planRef.id)
      })
    },

    updatePlanForAdmin(planId, input) {
      return requireAdmin(auth).then(() => {
        const id = assertString(planId, 'Plan ID', { maxLength: 150 })
        const data = {
          ...validatePlan(input),
          updatedAt: serverTimestamp(),
        }
        return runWrite('update membership plan', () => updateDoc(doc(db, 'membershipPlans', id), data))
      })
    },

    getMyMemberships() {
      const user = requireUser(auth)
      return readCollection({
        db,
        path: 'memberships',
        constraints: [where('memberUid', '==', user.uid), orderBy('createdAt', 'desc')],
      })
    },

    watchMyMemberships(callback) {
      const user = requireUser(auth)
      return watchCollection({
        db,
        path: 'memberships',
        constraints: [where('memberUid', '==', user.uid), orderBy('createdAt', 'desc')],
        callback,
      })
    },

    getAllMembershipsForAdmin() {
      return requireAdmin(auth).then(() => readCollection({
        db,
        path: 'memberships',
        constraints: [orderBy('createdAt', 'desc')],
      }))
    },

    watchAllMembershipsForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({
          db,
          path: 'memberships',
          constraints: [orderBy('createdAt', 'desc')],
          callback: next,
        }),
        callback,
        operation: 'verify administrator access',
      })
    },

    createMembershipForAdmin() {
      return Promise.reject(trustedWorkflowRequired('Membership creation requires a trusted administrative workflow; direct client writes are denied by Firestore rules.'))
    },

    updateMembershipForAdmin() {
      return Promise.reject(trustedWorkflowRequired('Membership updates require a trusted administrative workflow; direct client writes are denied by Firestore rules.'))
    },
  }
}
