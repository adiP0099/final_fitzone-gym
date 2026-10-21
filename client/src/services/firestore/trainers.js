import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import {
  assertOnlyFields,
  assertOptionalString,
  assertRecord,
  assertString,
  readCollection,
  readDocument,
  requireAdmin,
  runWrite,
  watchAfterAuth,
  watchCollection,
} from './core.js'

function validateTrainer(input) {
  const trainer = assertRecord(input, 'Trainer')
  const fields = [
    'displayName',
    'bio',
    'specializations',
    'availability',
    'active',
    'experienceYears',
    'profileImageUrl',
    'email',
    'phone',
  ]
  assertOnlyFields(trainer, fields, 'Trainer')
  const profile = {
    displayName: assertString(trainer.displayName, 'Trainer name', { maxLength: 100 }),
    bio: assertString(trainer.bio, 'Trainer biography', { maxLength: 3000 }),
    specializations: trainer.specializations,
    availability: trainer.availability,
    active: trainer.active,
    experienceYears: trainer.experienceYears,
    profileImageUrl: assertOptionalString(trainer.profileImageUrl, 'Profile image URL', 2048) || null,
  }
  if (!Array.isArray(profile.specializations) || profile.specializations.length === 0
    || profile.specializations.length > 20
    || profile.specializations.some((item) => typeof item !== 'string' || !item.trim() || item.length > 100)) {
    throw new TypeError('Trainer specializations must be up to 20 strings of at most 100 characters.')
  }
  if (!profile.availability || typeof profile.availability !== 'object' || Array.isArray(profile.availability)
    || Object.keys(profile.availability).length > 50) {
    throw new TypeError('Trainer availability must be a map with no more than 50 keys.')
  }
  if (typeof profile.active !== 'boolean') throw new TypeError('Trainer active status must be a boolean.')
  if (!Number.isInteger(profile.experienceYears) || profile.experienceYears < 0 || profile.experienceYears > 80) {
    throw new TypeError('Trainer experience must be a whole number between 0 and 80.')
  }
  if (profile.profileImageUrl && !/^https?:\/\/\S+$/i.test(profile.profileImageUrl)) {
    throw new TypeError('Trainer profile image URL must use HTTP or HTTPS.')
  }

  const email = assertString(trainer.email, 'Trainer email', { maxLength: 254 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError('Trainer email must be a valid email address.')
  }
  const phone = assertOptionalString(trainer.phone, 'Trainer phone', 40)
  return {
    profile,
    privateProfile: { email, phone: phone || null },
  }
}

export function createTrainerService({ db, auth }) {
  return {
    getActiveTrainers() {
      return readCollection({
        db,
        path: 'trainers',
        constraints: [where('active', '==', true)],
      })
    },

    watchActiveTrainers(callback) {
      return watchCollection({
        db,
        path: 'trainers',
        constraints: [where('active', '==', true)],
        callback,
      })
    },

    getAllTrainersForAdmin() {
      return requireAdmin(auth).then(() => readCollection({ db, path: 'trainers' }))
    },

    watchAllTrainersForAdmin(callback) {
      return watchAfterAuth({
        authorize: () => requireAdmin(auth),
        subscribe: (next) => watchCollection({ db, path: 'trainers', callback: next }),
        callback,
        operation: 'verify administrator access',
      })
    },

    getTrainerPrivateForAdmin(trainerId) {
      return requireAdmin(auth).then(() => {
        const id = assertString(trainerId, 'Trainer ID', { maxLength: 150 })
        return readDocument({ db, path: 'trainerPrivate', id })
      })
    },

    createTrainerForAdmin(input) {
      return requireAdmin(auth).then(() => {
        const trainerRef = doc(collection(db, 'trainers'))
        const privateRef = doc(db, 'trainerPrivate', trainerRef.id)
        const { profile, privateProfile } = validateTrainer(input)
        const batch = writeBatch(db)
        batch.set(trainerRef, {
          ...profile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        batch.set(privateRef, {
          ...privateProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return runWrite('create trainer', () => batch.commit()).then(() => trainerRef.id)
      })
    },

    updateTrainerForAdmin(trainerId, input) {
      return requireAdmin(auth).then(async () => {
        const id = assertString(trainerId, 'Trainer ID', { maxLength: 150 })
        const { profile, privateProfile } = validateTrainer(input)
        const privateRef = doc(db, 'trainerPrivate', id)
        const privateSnapshot = await getDoc(privateRef)
        const batch = writeBatch(db)
        batch.update(doc(db, 'trainers', id), {
          ...profile,
          updatedAt: serverTimestamp(),
        })
        batch.set(privateRef, {
          ...privateProfile,
          ...(!privateSnapshot.exists() ? { createdAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true })
        return runWrite('update trainer', () => batch.commit())
      })
    },

    updateTrainerStatusForAdmin(trainerId, active) {
      return requireAdmin(auth).then(() => {
        const id = assertString(trainerId, 'Trainer ID', { maxLength: 150 })
        if (typeof active !== 'boolean') throw new TypeError('Trainer active status must be a boolean.')
        return runWrite('update trainer status', () => updateDoc(doc(db, 'trainers', id), {
          active,
          updatedAt: serverTimestamp(),
        }))
      })
    },
  }
}
