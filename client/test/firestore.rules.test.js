import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  collectionGroup,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const projectId = 'demo-fitzone-rules'
assert.match(projectId, /^demo-/, 'Rules tests must use a dedicated Firebase demo project ID.')

const requestPlans = {
  'active-plan': {
    name: 'Active Plan',
    description: 'An active test membership plan.',
  },
  'inactive-plan': {
    name: 'Inactive Plan',
    description: 'An inactive test membership plan.',
  },
  'approval-plan': {
    name: 'Approval Plan',
    description: 'A test plan for the approval workflow.',
  },
  'rejection-plan': {
    name: 'Rejection Plan',
    description: 'A test plan for the rejection workflow.',
  },
  'forged-owner-plan': {
    name: 'Forged Owner Plan',
    description: 'A test plan for ownership validation.',
  },
  'forged-status-plan': {
    name: 'Forged Status Plan',
    description: 'A test plan for status validation.',
  },
}

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
})

after(async () => {
  await testEnv?.cleanup()
})

async function seedDocuments() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await Promise.all([
      setDoc(doc(db, 'users/member-a'), {
        uid: 'member-a',
        displayName: 'Member A',
        email: 'member-a@example.test',
        role: 'member',
        accountStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      setDoc(doc(db, 'users/member-b'), {
        uid: 'member-b',
        displayName: 'Member B',
        email: 'member-b@example.test',
        role: 'member',
        accountStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      setDoc(doc(db, 'users/profile-role-admin'), {
        uid: 'profile-role-admin',
        displayName: 'Not a trusted admin',
        email: 'fake-admin@example.test',
        role: 'admin',
        accountStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      setDoc(doc(db, 'memberships/member-a-record'), { memberUid: 'member-a' }),
      setDoc(doc(db, 'memberships/member-b-record'), { memberUid: 'member-b' }),
      setDoc(doc(db, 'bookings/member-a-record'), { memberUid: 'member-a' }),
      setDoc(doc(db, 'bookings/member-b-record'), { memberUid: 'member-b' }),
      setDoc(doc(db, 'attendance/member-a-record'), { memberUid: 'member-a' }),
      setDoc(doc(db, 'attendance/member-b-record'), { memberUid: 'member-b' }),
      setDoc(doc(db, 'payments/member-a-record'), { memberUid: 'member-a' }),
      setDoc(doc(db, 'payments/member-b-record'), { memberUid: 'member-b' }),
      setDoc(doc(db, 'membershipPlans/active-plan'), {
        name: 'Active Plan',
        description: 'An active test membership plan.',
        durationDays: 30,
        priceMinor: 5000,
        currency: 'USD',
        benefits: ['Gym access'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      setDoc(doc(db, 'membershipPlans/inactive-plan'), {
        name: 'Inactive Plan',
        description: 'An inactive test membership plan.',
        durationDays: 30,
        priceMinor: 5000,
        currency: 'USD',
        benefits: ['Gym access'],
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      ...['approval-plan', 'rejection-plan', 'forged-owner-plan', 'forged-status-plan'].map((planId) => {
        const plan = requestPlans[planId]
        return setDoc(doc(db, `membershipPlans/${planId}`), {
          ...plan,
          durationDays: 30,
          priceMinor: 5000,
          currency: 'USD',
          benefits: ['Gym access'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }),
      setDoc(doc(db, 'trainers/active-trainer'), { active: true }),
      setDoc(doc(db, 'trainers/inactive-trainer'), { active: false }),
      setDoc(doc(db, 'trainers/second-active-trainer'), { active: true }),
      setDoc(doc(db, 'trainerPrivate/active-trainer'), {
        email: 'coach@example.test',
        phone: '+1 555 0100',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      setDoc(doc(db, 'enquiries/enquiry-a'), { status: 'new' }),
    ])
  })
}

function membershipRequest(uid, { planId = 'active-plan', membershipId = `${uid}-membership`, status = 'pending_review' } = {}) {
  const plan = requestPlans[planId]
  return {
    memberUid: uid,
    memberName: uid === 'member-a' ? 'Member A' : 'Member B',
    memberEmail: `${uid}@example.test`,
    planId,
    planSnapshot: {
      name: plan.name,
      description: plan.description,
      durationDays: 30,
      priceMinor: 5000,
      currency: 'USD',
      benefits: ['Gym access'],
    },
    membershipId,
    status,
    requestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function approvedMembership(uid, requestId) {
  const plan = requestPlans[requestId]
  return {
    memberUid: uid,
    planId: requestId,
    planName: plan.name,
    requestId,
    startAt: serverTimestamp(),
    endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'active',
    paymentStatus: 'unpaid',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

test('unauthenticated users cannot read or write protected records', async () => {
  await seedDocuments()
  const db = testEnv.unauthenticatedContext().firestore()

  await assertFails(getDoc(doc(db, 'users/member-a')))
  await assertFails(getDoc(doc(db, 'memberships/member-a-record')))
  await assertFails(setDoc(doc(db, 'users/anonymous'), {
    uid: 'anonymous',
    displayName: 'Anonymous',
    email: 'anonymous@example.test',
    role: 'member',
    accountStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
})

test('members can read their own records but not another member records', async () => {
  const db = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()

  for (const path of [
    'users/member-a',
    'memberships/member-a-record',
    'bookings/member-a-record',
    'attendance/member-a-record',
    'payments/member-a-record',
  ]) {
    await assertSucceeds(getDoc(doc(db, path)))
  }

  for (const path of [
    'users/member-b',
    'memberships/member-b-record',
    'bookings/member-b-record',
    'attendance/member-b-record',
    'payments/member-b-record',
  ]) {
    await assertFails(getDoc(doc(db, path)))
  }
  await assertFails(getDocs(collection(db, 'users')))
})

test('member queries must constrain private records to the caller UID', async () => {
  const db = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()

  await assertSucceeds(getDocs(query(
    collection(db, 'bookings'),
    where('memberUid', '==', 'member-a'),
  )))
  await assertFails(getDocs(collection(db, 'bookings')))
})

test('only trusted admins can list all booking records', async () => {
  const adminDb = testEnv.authenticatedContext('trusted-admin', { role: 'admin' }).firestore()
  const memberDb = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()

  await assertSucceeds(getDocs(collection(adminDb, 'bookings')))
  await assertFails(getDocs(collection(memberDb, 'bookings')))
})

test('members cannot self-promote by creating or editing a profile role', async () => {
  const db = testEnv.authenticatedContext('new-member', {
    email: 'new-member@example.test',
  }).firestore()

  await assertSucceeds(setDoc(doc(db, 'users/new-member'), {
    uid: 'new-member',
    displayName: 'New Member',
    email: 'new-member@example.test',
    role: 'member',
    accountStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  await assertSucceeds(updateDoc(doc(db, 'users/new-member'), {
    displayName: 'Updated Member',
    phone: '+1-555-0100',
    updatedAt: serverTimestamp(),
  }))

  await assertFails(setDoc(doc(db, 'users/new-member'), {
    uid: 'new-member',
    displayName: 'New Member',
    email: 'new-member@example.test',
    role: 'admin',
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  await assertFails(updateDoc(doc(db, 'users/new-member'), {
    role: 'admin',
    updatedAt: serverTimestamp(),
  }))

  for (const privilegedChange of [
    { uid: 'another-user' },
    { email: 'forged@example.test' },
    { accountStatus: 'active' },
  ]) {
    await assertFails(updateDoc(doc(db, 'users/new-member'), {
      ...privilegedChange,
      updatedAt: serverTimestamp(),
    }))
  }
})

test('a profile role does not grant admin access without a trusted token claim', async () => {
  const db = testEnv.authenticatedContext('profile-role-admin', {
    email: 'fake-admin@example.test',
  }).firestore()

  await assertFails(getDocs(collection(db, 'users')))
  await assertFails(getDocs(collection(db, 'trainers')))
  await assertFails(setDoc(doc(db, 'membershipPlans/forged-plan'), {
    name: 'Forged plan',
    description: 'Not authorized',
    durationDays: 30,
    priceMinor: 100,
    currency: 'USD',
    benefits: [],
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
})

test('trusted admin custom claims permit administrative reads and writes', async () => {
  const db = testEnv.authenticatedContext('trusted-admin', {
    email: 'trusted-admin@example.test',
    role: 'admin',
  }).firestore()

  await assertSucceeds(getDocs(collection(db, 'users')))
  await assertSucceeds(getDocs(collection(db, 'trainers')))
  await assertSucceeds(getDoc(doc(db, 'memberships/member-b-record')))
  await assertSucceeds(getDoc(doc(db, 'membershipPlans/inactive-plan')))
  await assertSucceeds(getDoc(doc(db, 'trainers/inactive-trainer')))

  await assertSucceeds(setDoc(doc(db, 'membershipPlans/admin-plan'), {
    name: 'Admin plan',
    description: 'Approved sample plan',
    durationDays: 30,
    priceMinor: 100,
    currency: 'USD',
    benefits: [],
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  await assertSucceeds(setDoc(doc(db, 'trainers/admin-trainer'), {
    displayName: 'Admin Coach',
    bio: 'Coach profile',
    specializations: ['strength'],
    availability: { monday: ['09:00'] },
    experienceYears: 5,
    profileImageUrl: 'https://example.test/admin-coach.jpg',
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  await assertSucceeds(getDoc(doc(db, 'trainerPrivate/active-trainer')))
  await assertSucceeds(getDocs(collection(db, 'trainerPrivate')))
  await assertSucceeds(setDoc(doc(db, 'trainerPrivate/admin-trainer'), {
    email: 'admin-coach@example.test',
    phone: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertSucceeds(updateDoc(doc(db, 'trainerPrivate/admin-trainer'), {
    phone: '+1 555 0102',
    updatedAt: serverTimestamp(),
  }))

  await assertFails(setDoc(doc(db, 'trainers/private-field-trainer'), {
    displayName: 'Invalid public profile',
    bio: 'Private contact fields do not belong here.',
    specializations: ['strength'],
    availability: {},
    active: true,
    email: 'leak@example.test',
    phone: '+1 555 0103',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  await assertSucceeds(setDoc(doc(db, 'bookings/admin-booking'), {
    memberUid: 'member-a',
    trainerId: 'active-trainer',
    bookingAt: new Date(Date.now() + 60 * 60 * 1000),
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  await assertFails(setDoc(doc(db, 'bookings/inactive-trainer-booking'), {
    memberUid: 'member-a',
    trainerId: 'inactive-trainer',
    bookingAt: new Date(Date.now() + 60 * 60 * 1000),
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  await assertSucceeds(updateDoc(doc(db, 'enquiries/enquiry-a'), {
    status: 'in_review',
    updatedAt: serverTimestamp(),
  }))
})

test('public reads are limited to active plans and trainers', async () => {
  const db = testEnv.unauthenticatedContext().firestore()

  await assertSucceeds(getDoc(doc(db, 'membershipPlans/active-plan')))
  await assertFails(getDoc(doc(db, 'membershipPlans/inactive-plan')))
  await assertSucceeds(getDoc(doc(db, 'trainers/active-trainer')))
  await assertFails(getDoc(doc(db, 'trainers/inactive-trainer')))
  await assertSucceeds(getDocs(query(
    collection(db, 'membershipPlans'),
    where('active', '==', true),
  )))
  await assertFails(getDocs(collection(db, 'membershipPlans')))
  await assertSucceeds(getDocs(query(
    collection(db, 'trainers'),
    where('active', '==', true),
  )))
  await assertFails(getDocs(collection(db, 'trainers')))
})

test('trusted admins can atomically create valid public and private trainer records', async () => {
  const adminDb = testEnv.authenticatedContext('trusted-admin', { role: 'admin' }).firestore()
  const memberDb = testEnv.authenticatedContext('member-a').firestore()
  const publicPath = 'trainers/atomic-admin-trainer'
  const privatePath = 'trainerPrivate/atomic-admin-trainer'
  const publicProfile = {
    displayName: 'Atomic Admin Coach',
    bio: 'A valid public trainer profile.',
    specializations: ['strength'],
    availability: { monday: ['09:00'] },
    experienceYears: 5,
    profileImageUrl: null,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const privateProfile = {
    email: 'atomic-coach@example.test',
    phone: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const adminBatch = writeBatch(adminDb)
  adminBatch.set(doc(adminDb, publicPath), publicProfile)
  adminBatch.set(doc(adminDb, privatePath), privateProfile)
  await assertSucceeds(adminBatch.commit())
  await assertSucceeds(getDoc(doc(adminDb, publicPath)))
  await assertSucceeds(getDoc(doc(adminDb, privatePath)))

  const memberBatch = writeBatch(memberDb)
  memberBatch.set(doc(memberDb, 'trainers/non-admin-atomic-trainer'), publicProfile)
  memberBatch.set(doc(memberDb, 'trainerPrivate/non-admin-atomic-trainer'), privateProfile)
  await assertFails(memberBatch.commit())
  await assert.equal(
    (await getDoc(doc(adminDb, 'trainers/non-admin-atomic-trainer'))).exists(),
    false,
  )
  await assert.equal(
    (await getDoc(doc(adminDb, 'trainerPrivate/non-admin-atomic-trainer'))).exists(),
    false,
  )

  const invalidPrivateBatch = writeBatch(adminDb)
  invalidPrivateBatch.set(doc(adminDb, 'trainers/invalid-private-trainer'), publicProfile)
  invalidPrivateBatch.set(doc(adminDb, 'trainerPrivate/invalid-private-trainer'), {
    ...privateProfile,
    publicBio: 'Unexpected field.',
  })
  await assertFails(invalidPrivateBatch.commit())
  await assert.equal(
    (await getDoc(doc(adminDb, 'trainers/invalid-private-trainer'))).exists(),
    false,
  )
  await assert.equal(
    (await getDoc(doc(adminDb, 'trainerPrivate/invalid-private-trainer'))).exists(),
    false,
  )
})

test('trainer contact records are admin-only and member selections stay on the owned profile', async () => {
  const unauthenticatedDb = testEnv.unauthenticatedContext().firestore()
  const memberDb = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()
  const otherMemberDb = testEnv.authenticatedContext('member-b', {
    email: 'member-b@example.test',
  }).firestore()
  const profileRoleAdminDb = testEnv.authenticatedContext('profile-role-admin', {
    email: 'fake-admin@example.test',
  }).firestore()
  const adminDb = testEnv.authenticatedContext('trusted-admin', { role: 'admin' }).firestore()

  await assertFails(getDoc(doc(unauthenticatedDb, 'trainerPrivate/active-trainer')))
  await assertFails(getDocs(collection(unauthenticatedDb, 'trainerPrivate')))
  await assertFails(setDoc(doc(unauthenticatedDb, 'trainerPrivate/anonymous'), {
    email: 'anonymous@example.test',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(getDoc(doc(memberDb, 'trainerPrivate/active-trainer')))
  await assertFails(getDocs(collection(memberDb, 'trainerPrivate')))
  await assertFails(getDoc(doc(profileRoleAdminDb, 'trainerPrivate/active-trainer')))
  await assertFails(setDoc(doc(memberDb, 'trainerPrivate/member-created'), {
    email: 'member@example.test',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(doc(memberDb, 'trainerPrivate/active-trainer'), {
    phone: '+1 555 0199',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(doc(memberDb, 'trainers/active-trainer'), {
    bio: 'Member attempted to edit a trainer profile.',
    updatedAt: serverTimestamp(),
  }))
  await assertSucceeds(getDoc(doc(adminDb, 'trainerPrivate/active-trainer')))

  const memberProfile = doc(memberDb, 'users/member-a')
  await assertSucceeds(updateDoc(memberProfile, {
    selectedTrainerId: 'active-trainer',
    trainerSelectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertSucceeds(updateDoc(memberProfile, {
    selectedTrainerId: 'second-active-trainer',
    trainerSelectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(memberProfile, {
    selectedTrainerId: 'inactive-trainer',
    trainerSelectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(memberProfile, {
    selectedTrainerId: 'missing-trainer',
    trainerSelectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(doc(memberDb, 'users/member-b'), {
    selectedTrainerId: 'active-trainer',
    trainerSelectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(memberProfile, {
    selectedTrainerId: 'active-trainer',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(memberProfile, {
    selectedTrainerId: 'active-trainer',
    trainerSelectedAt: serverTimestamp(),
    role: 'admin',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(memberProfile, {
    email: 'changed@example.test',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(memberProfile, {
    accountStatus: 'active',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(doc(otherMemberDb, 'users/member-a'), {
    selectedTrainerId: 'active-trainer',
    trainerSelectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))

  const legacyPublicRef = doc(adminDb, 'trainers/legacy-private-profile')
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'trainers/legacy-private-profile'), {
      displayName: 'Legacy Coach',
      bio: 'Old profile with improperly colocated contact data.',
      specializations: ['strength'],
      availability: {},
      active: true,
      email: 'legacy@example.test',
      phone: '+1 555 0198',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })
  await assertSucceeds(getDoc(legacyPublicRef))
  await assertFails(getDoc(doc(unauthenticatedDb, 'trainers/legacy-private-profile')))
  await assertFails(getDoc(doc(memberDb, 'trainers/legacy-private-profile')))
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), 'trainers/legacy-private-profile'))
  })
})

test('members can create and read only their own pending requests for active plans', async () => {
  const db = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()
  const requestRef = doc(db, 'users/member-a/membershipRequests/active-plan')

  await assertSucceeds(setDoc(requestRef, membershipRequest('member-a')))
  await assertFails(setDoc(requestRef, membershipRequest('member-a')))
  await assertSucceeds(getDoc(requestRef))
  await assertSucceeds(getDocs(collection(db, 'users/member-a/membershipRequests')))
  await assertFails(getDocs(collection(db, 'users/member-b/membershipRequests')))

  await assertFails(setDoc(doc(db, 'users/member-a/membershipRequests/inactive-plan'), membershipRequest('member-a', {
    planId: 'inactive-plan',
  })))
  await assertFails(setDoc(doc(db, 'users/member-b/membershipRequests/active-plan'), membershipRequest('member-a')))
  await assertFails(setDoc(doc(db, 'users/member-a/membershipRequests/forged-owner-plan'), {
    ...membershipRequest('member-a', { planId: 'forged-owner-plan' }),
    memberUid: 'member-b',
  }))
  await assertFails(setDoc(doc(db, 'users/member-a/membershipRequests/forged-status-plan'), {
    ...membershipRequest('member-a', { planId: 'forged-status-plan' }),
    status: 'approved',
  }))
  await assertFails(updateDoc(requestRef, {
    status: 'approved',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(deleteDoc(requestRef))
  const profileRoleAdminDb = testEnv.authenticatedContext('profile-role-admin', {
    email: 'fake-admin@example.test',
  }).firestore()
  await assertFails(updateDoc(doc(profileRoleAdminDb, 'users/member-a/membershipRequests/active-plan'), {
    status: 'rejected',
    reviewedByUid: 'profile-role-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
})

test('only an admin can approve a request atomically with an unpaid membership', async () => {
  const requestId = 'approval-plan'
  const membershipId = 'membership-approval'
  const memberDb = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()
  const requestRef = doc(memberDb, `users/member-a/membershipRequests/${requestId}`)
  await assertSucceeds(setDoc(requestRef, membershipRequest('member-a', { planId: requestId, membershipId })))

  const unauthorizedBatch = writeBatch(memberDb)
  unauthorizedBatch.update(requestRef, {
    status: 'approved',
    reviewedByUid: 'member-a',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  unauthorizedBatch.set(doc(memberDb, `memberships/${membershipId}`), approvedMembership('member-a', requestId))
  await assertFails(unauthorizedBatch.commit())

  const adminDb = testEnv.authenticatedContext('trusted-admin', { role: 'admin' }).firestore()
  await assertSucceeds(getDocs(query(
    collectionGroup(adminDb, 'membershipRequests'),
    where('status', '==', 'pending_review'),
  )))

  const paidMembershipBatch = writeBatch(adminDb)
  paidMembershipBatch.update(doc(adminDb, `users/member-a/membershipRequests/${requestId}`), {
    status: 'approved',
    reviewedByUid: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  paidMembershipBatch.set(doc(adminDb, `memberships/${membershipId}`), {
    ...approvedMembership('member-a', requestId),
    paymentStatus: 'paid',
  })
  await assertFails(paidMembershipBatch.commit())

  const wrongOwnerBatch = writeBatch(adminDb)
  wrongOwnerBatch.update(doc(adminDb, `users/member-a/membershipRequests/${requestId}`), {
    status: 'approved',
    reviewedByUid: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  wrongOwnerBatch.set(doc(adminDb, `memberships/${membershipId}`), approvedMembership('member-b', requestId))
  await assertFails(wrongOwnerBatch.commit())

  const approval = writeBatch(adminDb)
  approval.update(doc(adminDb, `users/member-a/membershipRequests/${requestId}`), {
    status: 'approved',
    reviewedByUid: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  approval.set(doc(adminDb, `memberships/${membershipId}`), approvedMembership('member-a', requestId))
  await assertSucceeds(approval.commit())
  await assertSucceeds(getDoc(doc(memberDb, `memberships/${membershipId}`)))

  await assertFails(updateDoc(doc(adminDb, `users/member-a/membershipRequests/${requestId}`), {
    status: 'approved',
    reviewedByUid: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(adminDb, 'memberships/unpaired-membership'), approvedMembership('member-a', requestId)))
})

test('request rejection does not create a membership and cannot be reversed by a member', async () => {
  const requestId = 'rejection-plan'
  const membershipId = 'membership-rejection'
  const memberDb = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()
  const requestRef = doc(memberDb, `users/member-a/membershipRequests/${requestId}`)
  await assertSucceeds(setDoc(requestRef, membershipRequest('member-a', { planId: requestId, membershipId })))

  const adminDb = testEnv.authenticatedContext('trusted-admin', { role: 'admin' }).firestore()
  await assertSucceeds(updateDoc(doc(adminDb, `users/member-a/membershipRequests/${requestId}`), {
    status: 'rejected',
    reviewedByUid: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    rejectionReason: 'Please contact the gym.',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(adminDb, `memberships/${membershipId}`), approvedMembership('member-a', requestId)))
  await assertFails(updateDoc(doc(memberDb, `users/member-a/membershipRequests/${requestId}`), {
    status: 'pending_review',
    updatedAt: serverTimestamp(),
  }))
})

test('sensitive direct writes and all deletes are denied', async () => {
  const db = testEnv.authenticatedContext('trusted-admin', {
    role: 'admin',
  }).firestore()

  for (const collectionName of ['memberships', 'attendance', 'payments', 'enquiries']) {
    await assertFails(setDoc(doc(db, collectionName, 'client-created'), {
      memberUid: 'trusted-admin',
    }))
    await assertFails(updateDoc(doc(db, collectionName, `${collectionName === 'enquiries' ? 'enquiry-a' : 'member-a-record'}`), {
      status: 'succeeded',
    }))
  }

  await assertFails(updateDoc(doc(db, 'payments/member-a-record'), {
    status: 'succeeded',
  }))
  await assertFails(updateDoc(doc(db, 'users/trusted-admin'), {
    role: 'admin',
    updatedAt: serverTimestamp(),
  }))

  for (const path of [
    'users/member-a',
    'membershipPlans/active-plan',
    'memberships/member-a-record',
    'bookings/member-a-record',
    'attendance/member-a-record',
    'trainers/active-trainer',
    'enquiries/enquiry-a',
    'payments/member-a-record',
  ]) {
    await assertFails(deleteDoc(doc(db, path)))
  }

  const memberDb = testEnv.authenticatedContext('member-a', {
    email: 'member-a@example.test',
  }).firestore()
  await assertFails(setDoc(doc(memberDb, 'bookings/member-created'), {
    memberUid: 'member-a',
    bookingAt: new Date(Date.now() + 60 * 60 * 1000),
    status: 'requested',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
})
