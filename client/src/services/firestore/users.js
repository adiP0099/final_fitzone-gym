import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import {
  assertOnlyFields,
  assertRecord,
  assertString,
  assertOptionalString,
  readCollection,
  readDocument,
  requireAdmin,
  requireUser,
  runWrite,
  watchAfterAuth,
  watchCollection,
  watchDocument,
} from './core.js'

const profileFields = ['displayName', 'phone', 'location']

export function createUserProfileService({ db, auth }) {
  return {
    getMyProfile() {
      const user = requireUser(auth)
      return readDocument({ db, path: 'users', id: user.uid })
    },

    watchMyProfile(callback) {
      const user = requireUser(auth)
      return watchDocument({ db, path: 'users', id: user.uid, callback })
    },

    createMyProfile(input) {
      const user = requireUser(auth)
      const profile = assertRecord(input, 'Profile')
      assertOnlyFields(profile, profileFields, 'Profile')

      const displayName = assertString(profile.displayName, 'Display name', { maxLength: 100 })
      const email = assertString(user.email, 'Account email', { maxLength: 254 })
      const phone = assertOptionalString(profile.phone, 'Phone', 40)
      const location = assertOptionalString(profile.location, 'Location', 200)
      const data = {
        uid: user.uid,
        displayName,
        email,
        role: 'member',
        accountStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      if (phone) data.phone = phone
      if (location) data.location = location

      return runWrite('create your profile', () => setDoc(doc(db, 'users', user.uid), data))
    },

    updateMyProfile(input) {
      const user = requireUser(auth)
      const profile = assertRecord(input, 'Profile update')
      assertOnlyFields(profile, profileFields, 'Profile update')
      const update = { updatedAt: serverTimestamp() }

      if ('displayName' in profile) {
        update.displayName = assertString(profile.displayName, 'Display name', { maxLength: 100 })
      }
      if ('phone' in profile) {
        update.phone = assertOptionalString(profile.phone, 'Phone', 40) || null
      }
      if ('location' in profile) {
        update.location = assertOptionalString(profile.location, 'Location', 200) || null
      }
      return runWrite('update your profile', () => updateDoc(doc(db, 'users', user.uid), update))
    },

    selectTrainerForMyProfile(trainerId) {
      const user = requireUser(auth)
      const id = assertString(trainerId, 'Trainer ID', { maxLength: 150 })
      return readDocument({ db, path: 'users', id: user.uid }).then(({ data: profile }) => {
        if (!profile) {
          throw new TypeError('Create your member profile before selecting a trainer.')
        }
        if (profile.selectedTrainerId === id) return { alreadySelected: true }
        return readDocument({ db, path: 'trainers', id }).then(({ data: trainer }) => {
          if (!trainer || trainer.active !== true) {
            throw new TypeError('Only an active trainer can be selected.')
          }
          return runWrite('select trainer', () => updateDoc(doc(db, 'users', user.uid), {
            selectedTrainerId: id,
            trainerSelectedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })).then(() => ({ alreadySelected: false }))
        })
      })
    },

    getProfileForAdmin(uid) {
      return requireAdmin(auth).then(() => {
        const id = assertString(uid, 'Member UID', { maxLength: 128 })
        return readDocument({ db, path: 'users', id })
      })
    },

    getAllProfilesForAdmin() {
      return requireAdmin(auth).then(() => readCollection({ db, path: 'users' }))
    },

    watchAllProfilesForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({ db, path: 'users', callback: next }),
        callback,
        operation: 'verify administrator access',
      })
    },

    updateAccountStatusForAdmin(uid, accountStatus) {
      return requireAdmin(auth).then(() => {
        const id = assertString(uid, 'Member UID', { maxLength: 128 })
        if (!['pending', 'active', 'suspended'].includes(accountStatus)) {
          throw new TypeError('Account status is invalid.')
        }
        return runWrite('update member account status', () => updateDoc(doc(db, 'users', id), {
          accountStatus,
          updatedAt: serverTimestamp(),
        }))
      })
    },
  }
}
