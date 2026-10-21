import { auth, db } from '../../firebase/config.js'
import { createAttendanceService } from './attendance.js'
import { createBookingService } from './bookings.js'
import { createEnquiryService } from './enquiries.js'
import { createMembershipService } from './memberships.js'
import { createMembershipRequestService } from './membershipRequests.js'
import { createPaymentService } from './payments.js'
import { createTrainerService } from './trainers.js'
import { createUserProfileService } from './users.js'

const dependencies = { db, auth }

export const userProfiles = createUserProfileService(dependencies)
export const memberships = createMembershipService(dependencies)
export const membershipRequests = createMembershipRequestService(dependencies)
export const bookings = createBookingService(dependencies)
export const attendance = createAttendanceService(dependencies)
export const trainers = createTrainerService(dependencies)
export const enquiries = createEnquiryService(dependencies)
export const payments = createPaymentService(dependencies)
