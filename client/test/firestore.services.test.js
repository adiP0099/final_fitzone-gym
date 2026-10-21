import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { createAttendanceService } from '../src/services/firestore/attendance.js'
import { createBookingService } from '../src/services/firestore/bookings.js'
import { createEnquiryService } from '../src/services/firestore/enquiries.js'
import { createMembershipService } from '../src/services/firestore/memberships.js'
import { createMembershipRequestService } from '../src/services/firestore/membershipRequests.js'
import { createPaymentService } from '../src/services/firestore/payments.js'
import { createTrainerService } from '../src/services/firestore/trainers.js'
import { createUserProfileService } from '../src/services/firestore/users.js'
import { collectionWatchErrorState } from '../src/services/firestore/core.js'
import {
  formatPlanPrice,
  minorUnitsToPriceInput,
  parsePriceToMinorUnits,
} from '../src/services/planPricing.js'

const projectId = 'demo-fitzone-rules'
const memberUid = 'service-member-a'
const otherUid = 'service-member-b'
const now = new Date()

assert.match(projectId, /^demo-/, 'Service tests must use a dedicated Firebase demo project ID.')

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId })
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await Promise.all([
      setDoc(doc(db, 'membershipPlans/service-active-plan'), {
        name: 'Service Active Plan',
        description: 'Active test plan',
        durationDays: 30,
        priceMinor: 5000,
        currency: 'USD',
        benefits: ['Gym access'],
        active: true,
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'membershipPlans/service-inactive-plan'), {
        name: 'Service Inactive Plan',
        description: 'Inactive test plan',
        durationDays: 30,
        priceMinor: 5000,
        currency: 'USD',
        benefits: ['Gym access'],
        active: false,
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'membershipPlans/service-second-plan'), {
        name: 'Service Second Plan',
        description: 'Second active test plan',
        durationDays: 7,
        priceMinor: 1200,
        currency: 'USD',
        benefits: ['Classes'],
        active: true,
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'users/request-member'), {
        uid: 'request-member',
        displayName: 'Request Member',
        email: 'request-member@example.test',
        role: 'member',
        accountStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'memberships/service-member-membership'), {
        memberUid,
        createdAt: now,
      }),
      setDoc(doc(db, 'memberships/service-other-membership'), {
        memberUid: otherUid,
        createdAt: now,
      }),
      setDoc(doc(db, 'bookings/service-member-booking'), {
        memberUid,
        bookingAt: now,
      }),
      setDoc(doc(db, 'bookings/service-other-booking'), {
        memberUid: otherUid,
        bookingAt: now,
      }),
      setDoc(doc(db, 'attendance/service-member-attendance'), {
        memberUid,
        checkInAt: now,
      }),
      setDoc(doc(db, 'payments/service-member-payment'), {
        memberUid,
        createdAt: now,
        status: 'pending',
      }),
      setDoc(doc(db, 'payments/service-other-payment'), {
        memberUid: otherUid,
        createdAt: now,
        status: 'pending',
      }),
      setDoc(doc(db, 'trainers/service-active-trainer'), {
        displayName: 'Service Coach',
        bio: 'Test coach',
        specializations: ['strength'],
        availability: { monday: ['09:00'] },
        experienceYears: 6,
        active: true,
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'trainers/service-second-trainer'), {
        displayName: 'Service Second Coach',
        bio: 'Second test coach',
        specializations: ['mobility'],
        availability: {},
        active: true,
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, 'trainers/service-inactive-trainer'), {
        active: false,
      }),
      setDoc(doc(db, 'enquiries/service-enquiry'), {
        status: 'new',
        createdAt: now,
      }),
    ])
  })
})

after(async () => {
  await testEnv?.cleanup()
})

function servicesFor(uid = memberUid, claims = {}) {
  const user = {
    uid,
    email: `${uid}@example.test`,
    getIdTokenResult: async () => ({ claims }),
  }
  const auth = { currentUser: user }
  const db = testEnv.authenticatedContext(uid, {
    email: user.email,
    ...claims,
  }).firestore()
  const dependencies = { db, auth }
  return {
    user,
    db,
    auth,
    profiles: createUserProfileService(dependencies),
    memberships: createMembershipService(dependencies),
    membershipRequests: createMembershipRequestService(dependencies),
    bookings: createBookingService(dependencies),
    attendance: createAttendanceService(dependencies),
    trainers: createTrainerService(dependencies),
    enquiries: createEnquiryService(dependencies),
    payments: createPaymentService(dependencies),
  }
}

test('member services derive ownership from Auth and return data/empty state', async () => {
  const services = servicesFor()

  const planResult = await services.memberships.getActivePlans()
  assert.equal(planResult.empty, false)
  assert.deepEqual(planResult.data.map((plan) => plan.id), ['service-active-plan', 'service-second-plan'])

  assert.deepEqual(
    (await services.memberships.getMyMemberships()).data.map((record) => record.id),
    ['service-member-membership'],
  )
  assert.deepEqual(
    (await services.bookings.getMyBookings()).data.map((record) => record.id),
    ['service-member-booking'],
  )
  assert.deepEqual(
    (await services.attendance.getMyAttendance()).data.map((record) => record.id),
    ['service-member-attendance'],
  )
  assert.deepEqual(
    (await services.payments.getMyPayments()).data.map((record) => record.id),
    ['service-member-payment'],
  )

  const missingProfile = await services.profiles.getMyProfile()
  assert.equal(missingProfile.data, null)
  assert.equal(missingProfile.empty, true)
})

test('admin membership plan services create, edit, deactivate, and reactivate plans', async () => {
  const adminServices = servicesFor('service-admin', { role: 'admin' })
  const planId = await adminServices.memberships.createPlanForAdmin({
    name: 'Persistent Plan',
    description: 'Created through the plan service',
    durationDays: 45,
    priceMinor: 1299,
    currency: 'USD',
    benefits: ['Open gym'],
    active: true,
  })

  let resolvePlanState
  const planState = new Promise((resolve) => { resolvePlanState = resolve })
  const unsubscribe = adminServices.memberships.watchAllPlansForAdmin((state) => {
    if (!state.loading && !state.error && state.data.some((plan) => plan.id === planId)) {
      resolvePlanState(state)
    }
  })
  const loaded = await planState
  unsubscribe()
  const createdPlan = loaded.data.find((plan) => plan.id === planId)
  assert.equal(createdPlan.name, 'Persistent Plan')
  assert.equal(createdPlan.priceMinor, 1299)
  assert.equal(createdPlan.active, true)

  await adminServices.memberships.updatePlanForAdmin(planId, {
    name: 'Edited Plan',
    description: 'Edited details',
    durationDays: 60,
    priceMinor: 2500,
    currency: 'USD',
    benefits: ['Open gym', 'Classes'],
    active: false,
  })
  let persisted = await adminServices.memberships.getAllPlansForAdmin()
  let editedPlan = persisted.data.find((plan) => plan.id === planId)
  assert.equal(editedPlan.name, 'Edited Plan')
  assert.equal(editedPlan.durationDays, 60)
  assert.equal(editedPlan.priceMinor, 2500)
  assert.equal(editedPlan.active, false)

  await adminServices.memberships.updatePlanForAdmin(planId, {
    name: editedPlan.name,
    description: editedPlan.description,
    durationDays: editedPlan.durationDays,
    priceMinor: editedPlan.priceMinor,
    currency: editedPlan.currency,
    benefits: editedPlan.benefits,
    active: true,
  })
  persisted = await adminServices.memberships.getAllPlansForAdmin()
  editedPlan = persisted.data.find((plan) => plan.id === planId)
  assert.equal(editedPlan.active, true)
})

test('admin plan watchers report loading and authorization failures safely', async () => {
  const adminServices = servicesFor('service-admin', { role: 'admin' })
  const memberServices = servicesFor()
  const adminStates = []
  let resolveLoaded
  const loadedState = new Promise((resolve) => { resolveLoaded = resolve })
  const unsubscribe = adminServices.memberships.watchAllPlansForAdmin((state) => {
    adminStates.push(state)
    if (!state.loading) resolveLoaded(state)
  })
  await loadedState
  unsubscribe()
  assert.equal(adminStates[0].loading, true)
  assert.equal(adminStates.some((state) => !state.loading && !state.error), true)

  let resolveFailure
  const failure = new Promise((resolve) => { resolveFailure = resolve })
  const stopWatching = memberServices.memberships.watchAllPlansForAdmin((state) => {
    if (!state.loading && state.error) resolveFailure(state.error)
  })
  const error = await failure
  stopWatching()
  assert.equal(error.code, 'firestore/permission-denied')
})

test('membership plan prices convert exactly using the currency minor unit', () => {
  assert.equal(parsePriceToMinorUnits('39.99', 'USD'), 3999)
  assert.equal(parsePriceToMinorUnits('125', 'JPY'), 125)
  assert.equal(minorUnitsToPriceInput(3999, 'USD'), '39.99')
  assert.equal(minorUnitsToPriceInput(125, 'JPY'), '125')
  assert.equal(formatPlanPrice(3999, 'USD'), new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(39.99))
  assert.throws(() => parsePriceToMinorUnits('12.345', 'USD'), /no more than 2 decimal places/)
  assert.throws(() => parsePriceToMinorUnits('12.5', 'JPY'), /no more than 0 decimal places/)
})

test('profile writes fix UID, email, role, and status from trusted Auth/default policy', async () => {
  const services = servicesFor()

  assert.throws(
    () => services.profiles.createMyProfile({
      uid: otherUid,
      displayName: 'Member',
      role: 'admin',
    }),
    { code: 'firestore/invalid-input' },
  )

  await services.profiles.createMyProfile({
    displayName: 'Service Member',
    phone: '+1 555 0100',
  })
  const created = await services.profiles.getMyProfile()
  assert.equal(created.data.uid, memberUid)
  assert.equal(created.data.email, `${memberUid}@example.test`)
  assert.equal(created.data.role, 'member')
  assert.equal(created.data.accountStatus, 'pending')

  await services.profiles.updateMyProfile({ displayName: 'Updated Service Member' })
  const updated = await services.profiles.getMyProfile()
  assert.equal(updated.data.displayName, 'Updated Service Member')
})

test('service subscriptions expose loading and populated/empty states', async () => {
  const services = servicesFor()
  const states = []
  let unsubscribe
  const settled = new Promise((resolve) => {
    unsubscribe = services.trainers.watchActiveTrainers((state) => {
      states.push(state)
      if (!state.loading) resolve(state)
    })
  })
  const result = await settled
  unsubscribe()

  assert.equal(states[0].loading, true)
  assert.equal(result.loading, false)
  assert.equal(result.empty, false)
  assert.equal(result.error, null)
  assert.ok(result.data.some((trainer) => trainer.id === 'service-active-trainer'))
  assert.ok(result.data.every((trainer) => trainer.active === true))
})

test('admin trainer service lists all profiles and streams changes', async () => {
  const adminServices = servicesFor('service-admin', { role: 'admin' })
  const initial = await adminServices.trainers.getAllTrainersForAdmin()
  assert.ok(initial.data.some((trainer) => trainer.id === 'service-active-trainer'))
  assert.ok(initial.data.some((trainer) => trainer.id === 'service-inactive-trainer'))

  let resolveUpdated
  const updatedState = new Promise((resolve) => { resolveUpdated = resolve })
  const unsubscribe = adminServices.trainers.watchAllTrainersForAdmin((state) => {
    if (state.data?.some((trainer) => trainer.id === 'service-new-trainer')) resolveUpdated(state)
  })
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'trainers/service-new-trainer'), {
      displayName: 'New Coach',
      bio: 'New trainer profile',
      specializations: ['mobility'],
      availability: {},
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  })
  const updated = await updatedState
  unsubscribe()
  assert.ok(updated.data.some((trainer) => trainer.id === 'service-new-trainer'))
})

test('admin trainer service creates, edits, deactivates, and protects private contact data', async () => {
  const adminServices = servicesFor('service-trainer-admin', { role: 'admin' })
  let trainerId = null
  let latestTrainerState = null
  let resolveTrainerVisible
  const trainerVisible = new Promise((resolve) => { resolveTrainerVisible = resolve })
  const unsubscribe = adminServices.trainers.watchAllTrainersForAdmin((state) => {
    latestTrainerState = state
    if (trainerId && state.data?.some((trainer) => trainer.id === trainerId)) resolveTrainerVisible(state)
  })
  trainerId = await adminServices.trainers.createTrainerForAdmin({
    displayName: 'Private Contact Coach',
    email: 'coach@example.test',
    phone: '+1 555 0101',
    bio: 'Focuses on strength and movement.',
    specializations: ['strength', 'mobility'],
    availability: {},
    experienceYears: 8,
    profileImageUrl: 'https://example.test/coach.jpg',
    active: true,
  })
  if (latestTrainerState?.data?.some((trainer) => trainer.id === trainerId)) {
    resolveTrainerVisible(latestTrainerState)
  }
  const listedAfterCreate = await trainerVisible
  unsubscribe()
  assert.ok(listedAfterCreate.data.some((trainer) => trainer.id === trainerId))
  const listedAfterReload = await adminServices.trainers.getAllTrainersForAdmin()
  assert.ok(listedAfterReload.data.some((trainer) => trainer.id === trainerId))

  const publicProfile = await getDoc(doc(adminServices.db, `trainers/${trainerId}`))
  const privateProfile = await getDoc(doc(adminServices.db, `trainerPrivate/${trainerId}`))
  assert.equal(publicProfile.data().displayName, 'Private Contact Coach')
  assert.equal(publicProfile.data().experienceYears, 8)
  assert.equal(publicProfile.data().profileImageUrl, 'https://example.test/coach.jpg')
  assert.equal('email' in publicProfile.data(), false)
  assert.equal('phone' in publicProfile.data(), false)
  assert.equal(privateProfile.data().email, 'coach@example.test')
  assert.equal(privateProfile.data().phone, '+1 555 0101')
  assert.equal((await adminServices.trainers.getTrainerPrivateForAdmin(trainerId)).data.email, 'coach@example.test')

  await adminServices.trainers.updateTrainerForAdmin(trainerId, {
    displayName: 'Updated Contact Coach',
    email: 'updated@example.test',
    phone: '',
    bio: 'Updated professional biography.',
    specializations: ['conditioning'],
    availability: {},
    experienceYears: 9,
    profileImageUrl: '',
    active: true,
  })
  const updatedPublic = await getDoc(doc(adminServices.db, `trainers/${trainerId}`))
  const updatedPrivate = await getDoc(doc(adminServices.db, `trainerPrivate/${trainerId}`))
  assert.equal(updatedPublic.data().displayName, 'Updated Contact Coach')
  assert.equal(updatedPublic.data().experienceYears, 9)
  assert.equal(updatedPublic.data().profileImageUrl, null)
  assert.equal(updatedPrivate.data().email, 'updated@example.test')
  assert.equal(updatedPrivate.data().phone, null)

  await adminServices.trainers.updateTrainerStatusForAdmin(trainerId, false)
  assert.equal((await getDoc(doc(adminServices.db, `trainers/${trainerId}`))).data().active, false)
  assert.ok(!(await adminServices.trainers.getActiveTrainers()).data.some((trainer) => trainer.id === trainerId))
  await adminServices.trainers.updateTrainerStatusForAdmin(trainerId, true)
  assert.equal((await getDoc(doc(adminServices.db, `trainers/${trainerId}`))).data().active, true)
  assert.ok((await adminServices.trainers.getActiveTrainers()).data.some((trainer) => trainer.id === trainerId))
})

test('trainer collection listener errors preserve valid data and report the error', () => {
  const lastData = [{ id: 'trainer-a', displayName: 'Previously loaded coach', active: true }]
  const state = collectionWatchErrorState(
    'trainers',
    lastData,
    Object.assign(new Error('Permission denied'), { code: 'permission-denied' }),
  )

  assert.equal(state.data, lastData)
  assert.equal(state.empty, false)
  assert.equal(state.loading, false)
  assert.match(state.error.message, /Permission denied/)
  assert.equal(state.error.code, 'permission-denied')
})

test('members cannot create or edit trainer profiles or private contact records', async () => {
  const memberServices = servicesFor('service-trainer-member')
  const input = {
    displayName: 'Unauthorized Coach',
    email: 'unauthorized@example.test',
    phone: '',
    bio: 'Should not be saved.',
    specializations: ['strength'],
    availability: {},
    experienceYears: 1,
    profileImageUrl: '',
    active: true,
  }
  await assert.rejects(memberServices.trainers.createTrainerForAdmin(input), {
    code: 'firestore/permission-denied',
  })
  await assert.rejects(memberServices.trainers.updateTrainerForAdmin('service-active-trainer', input), {
    code: 'firestore/permission-denied',
  })
  await assert.rejects(memberServices.trainers.getTrainerPrivateForAdmin('service-active-trainer'), {
    code: 'firestore/permission-denied',
  })
})

test('members can select, repeat, and switch their own active trainer', async () => {
  const uid = 'service-trainer-selector'
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `users/${uid}`), {
      uid,
      displayName: 'Trainer Selector',
      email: `${uid}@example.test`,
      role: 'member',
      accountStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  })
  const memberServices = servicesFor(uid)

  assert.deepEqual(
    await memberServices.profiles.selectTrainerForMyProfile('service-active-trainer'),
    { alreadySelected: false },
  )
  const firstSelection = (await memberServices.profiles.getMyProfile()).data
  assert.equal(firstSelection.selectedTrainerId, 'service-active-trainer')
  assert.ok(firstSelection.trainerSelectedAt)
  assert.deepEqual(
    await memberServices.profiles.selectTrainerForMyProfile('service-active-trainer'),
    { alreadySelected: true },
  )
  assert.deepEqual(
    await memberServices.profiles.selectTrainerForMyProfile('service-second-trainer'),
    { alreadySelected: false },
  )
  assert.equal((await memberServices.profiles.getMyProfile()).data.selectedTrainerId, 'service-second-trainer')
  await assert.rejects(
    memberServices.profiles.selectTrainerForMyProfile('service-inactive-trainer'),
    { code: 'permission-denied' },
  )
})

test('trainer administration watcher denies members without a trusted claim', async () => {
  const memberServices = servicesFor()
  const observed = []
  let resolveError
  const failed = new Promise((resolve) => { resolveError = resolve })
  const unsubscribe = memberServices.trainers.watchAllTrainersForAdmin((state) => {
    observed.push(state)
    if (!state.loading && state.error) resolveError(state.error)
  })
  const error = await failed
  unsubscribe()
  assert.equal(observed[0].loading, true)
  assert.equal(error.code, 'firestore/permission-denied')
})

test('admin booking service lists and streams all bookings; members are denied', async () => {
  const adminServices = servicesFor('service-admin', { role: 'admin' })
  const initial = await adminServices.bookings.getAllBookingsForAdmin()
  assert.ok(initial.data.some((booking) => booking.id === 'service-member-booking'))
  assert.ok(initial.data.some((booking) => booking.id === 'service-other-booking'))

  let resolveUpdated
  const updatedState = new Promise((resolve) => { resolveUpdated = resolve })
  const unsubscribe = adminServices.bookings.watchAllBookingsForAdmin((state) => {
    if (state.data?.some((booking) => booking.id === 'service-new-booking')) resolveUpdated(state)
  })
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'bookings/service-new-booking'), {
      memberUid: otherUid,
      bookingAt: now,
      status: 'requested',
    })
  })
  const updated = await updatedState
  unsubscribe()
  assert.ok(updated.data.some((booking) => booking.id === 'service-new-booking'))

  const memberServices = servicesFor()
  await assert.rejects(memberServices.bookings.getAllBookingsForAdmin(), {
    code: 'firestore/permission-denied',
  })
})

test('membership request service uses Auth ownership, detects duplicates, and processes decisions atomically', async () => {
  const memberServices = servicesFor('request-member')
  const created = await memberServices.membershipRequests.createMyRequest('service-active-plan', otherUid)
  assert.equal(created.status, 'created')

  const requestRef = doc(memberServices.db, `users/request-member/membershipRequests/${created.requestId}`)
  const createdRequest = await getDoc(requestRef)
  assert.equal(createdRequest.data().memberUid, 'request-member')
  assert.equal(createdRequest.data().status, 'pending_review')
  assert.equal(createdRequest.data().planSnapshot.name, 'Service Active Plan')

  const duplicate = await memberServices.membershipRequests.createMyRequest('service-active-plan')
  assert.equal(duplicate.status, 'duplicate')
  assert.equal(duplicate.requestId, created.requestId)
  await assert.rejects(
    memberServices.membershipRequests.createMyRequest('service-inactive-plan'),
    { code: 'permission-denied' },
  )

  const adminServices = servicesFor('request-admin', { role: 'admin' })
  let unsubscribe
  const pendingState = await new Promise((resolve) => {
    unsubscribe = adminServices.membershipRequests.watchPendingForAdmin((state) => {
      if (!state.loading) resolve(state)
    })
  })
  unsubscribe()
  assert.equal(pendingState.error, null)
  assert.ok(pendingState.data.some((request) => request.id === created.requestId))

  const approval = await adminServices.membershipRequests.reviewRequestForAdmin({
    memberUid: 'request-member',
    requestId: created.requestId,
    decision: 'approved',
  })
  assert.equal(approval.status, 'approved')
  const approvedRequest = await getDoc(requestRef)
  const activeMembership = await getDoc(doc(memberServices.db, `memberships/${approvedRequest.data().membershipId}`))
  assert.equal(approvedRequest.data().status, 'approved')
  assert.equal(activeMembership.data().memberUid, 'request-member')
  assert.equal(activeMembership.data().status, 'active')
  assert.equal(activeMembership.data().paymentStatus, 'unpaid')
  assert.ok((await memberServices.memberships.getMyMemberships()).data.some(
    (membership) => membership.id === activeMembership.id,
  ))

  const rejectedRequestResult = await memberServices.membershipRequests.createMyRequest('service-second-plan')
  const rejection = await adminServices.membershipRequests.reviewRequestForAdmin({
    memberUid: 'request-member',
    requestId: rejectedRequestResult.requestId,
    decision: 'rejected',
    rejectionReason: 'Please ask us about the schedule.',
  })
  assert.equal(rejection.status, 'rejected')
  const rejectedRequest = await getDoc(doc(memberServices.db, `users/request-member/membershipRequests/${rejectedRequestResult.requestId}`))
  assert.equal(rejectedRequest.data().status, 'rejected')
  assert.equal(rejectedRequest.data().rejectionReason, 'Please ask us about the schedule.')
  const rejectedMembership = await getDoc(doc(adminServices.db, `memberships/${rejectedRequest.data().membershipId}`))
  assert.equal(rejectedMembership.exists(), false)
  const repeatedDecision = await adminServices.membershipRequests.reviewRequestForAdmin({
    memberUid: 'request-member',
    requestId: rejectedRequestResult.requestId,
    decision: 'approved',
  })
  assert.equal(repeatedDecision.status, 'already-reviewed')
})

test('admin profile service lists profiles and emits live updates', async () => {
  const adminServices = servicesFor('service-admin', { role: 'admin' })
  const result = await adminServices.profiles.getAllProfilesForAdmin()
  assert.equal(result.empty, false)
  assert.ok(result.data.some((profile) => profile.id === 'request-member'))

  let resolveUpdated
  const updatedState = new Promise((resolve) => { resolveUpdated = resolve })
  const unsubscribe = adminServices.profiles.watchAllProfilesForAdmin((state) => {
    if (state.data?.some((profile) => profile.id === 'new-member-profile')) {
      resolveUpdated(state)
    }
  })
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/new-member-profile'), {
      uid: 'new-member-profile',
      displayName: 'New Member',
      email: 'new-member@example.test',
      role: 'member',
      accountStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  })
  const state = await updatedState
  unsubscribe()
  assert.equal(state.empty, false)
  assert.equal(state.data.find((profile) => profile.id === 'new-member-profile').displayName, 'New Member')
})

test('profile listing watcher reports empty and unauthorized states', async () => {
  const emptyEnv = await initializeTestEnvironment({
    projectId: 'demo-fitzone-empty-profiles',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
  try {
    const emptyUser = { uid: 'empty-admin', getIdTokenResult: async () => ({ claims: { role: 'admin' } }) }
    const emptyDb = emptyEnv.authenticatedContext('empty-admin', { role: 'admin' }).firestore()
    const emptyProfiles = createUserProfileService({ db: emptyDb, auth: { currentUser: emptyUser } })
    let resolveEmpty
    const emptyState = new Promise((resolve) => { resolveEmpty = resolve })
    const stopEmpty = emptyProfiles.watchAllProfilesForAdmin((state) => {
      if (!state.loading) resolveEmpty(state)
    })
    const emptyResult = await emptyState
    stopEmpty()
    assert.equal(emptyResult.empty, true)
    assert.deepEqual(emptyResult.data, [])
  } finally {
    await emptyEnv.cleanup()
  }

  const memberServices = servicesFor()
  const observedStates = []
  let resolveFailure
  const failure = new Promise((resolve) => { resolveFailure = resolve })
  const stopWatching = memberServices.profiles.watchAllProfilesForAdmin((state) => {
    observedStates.push(state)
    if (!state.loading && state.error) resolveFailure(state.error)
  })
  const error = await failure
  stopWatching()
  assert.equal(observedStates[0].loading, true)
  assert.equal(error.code, 'firestore/permission-denied')
})

test('administrator services require a trusted claim and rules authorization', async () => {
  const memberServices = servicesFor(memberUid, { role: 'member' })
  await assert.rejects(
    memberServices.memberships.createPlanForAdmin({
      name: 'Unauthorized',
      description: 'Should not write',
      durationDays: 30,
      priceMinor: 100,
      currency: 'USD',
      benefits: [],
      active: true,
    }),
    { code: 'firestore/permission-denied' },
  )
  await assert.rejects(memberServices.bookings.getAllBookingsForAdmin(), {
    code: 'firestore/permission-denied',
  })

  const adminServices = servicesFor('service-admin', { role: 'admin' })
  const planId = await adminServices.memberships.createPlanForAdmin({
    name: 'Service Admin Plan',
    description: 'Plan created in the emulator',
    durationDays: 30,
    priceMinor: 2500,
    currency: 'USD',
    benefits: ['Access'],
    active: true,
  })
  assert.equal(typeof planId, 'string')

  await assert.rejects(
    adminServices.enquiries.submitEnquiry({ message: 'not supported directly' }),
    /trusted submission endpoint/,
  )
})

test('payment, attendance, membership, and member booking writes remain restricted', async () => {
  const services = servicesFor()
  await assert.rejects(services.payments.markPaymentPaid(), {
    code: 'firestore/trusted-workflow-required',
    message: /cannot mark payments as paid/,
  })
  await assert.rejects(services.payments.recordPayment(), {
    code: 'firestore/trusted-workflow-required',
    message: /read-only in the client/,
  })
  await assert.rejects(services.attendance.createAttendance(), {
    code: 'firestore/trusted-workflow-required',
    message: /trusted check-in workflow/,
  })
  await assert.rejects(services.memberships.createMembershipForAdmin(), {
    code: 'firestore/trusted-workflow-required',
    message: /trusted administrative workflow/,
  })
  await assert.rejects(services.bookings.createBooking(), {
    code: 'firestore/trusted-workflow-required',
    message: /not enabled by the Firestore rules/,
  })
})
