export const ENQUIRY_SUBJECTS = [
  'General Inquiry',
  'Membership Plans & Pricing',
  'Personal Coaching',
  'Claim a Free Day Pass',
  'Facility Tour & Amenities',
]

function requiredString(value, field, maxLength) {
  if (typeof value !== 'string') {
    throw new TypeError(`${field} is required.`)
  }
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) {
    throw new TypeError(`${field} must be between 1 and ${maxLength} characters.`)
  }
  return normalized
}

export function validateEnquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Enquiry data must be an object.')
  }

  const allowedFields = ['name', 'email', 'phone', 'subject', 'message']
  const unexpectedFields = Object.keys(input).filter((field) => !allowedFields.includes(field))
  if (unexpectedFields.length) {
    throw new TypeError(`Unsupported enquiry fields: ${unexpectedFields.join(', ')}.`)
  }

  const name = requiredString(input.name, 'Name', 100)
  const email = requiredString(input.email, 'Email', 254)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError('Enter a valid email address.')
  }

  const phone = requiredString(input.phone, 'Phone number', 40)
  const digits = phone.replace(/\D/g, '')
  if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    throw new TypeError('Enter a valid phone number with 7 to 15 digits.')
  }

  const subject = requiredString(input.subject, 'Subject', 100)
  if (!ENQUIRY_SUBJECTS.includes(subject)) {
    throw new TypeError('Select a valid enquiry topic.')
  }

  const message = requiredString(input.message, 'Message', 5000)

  return { name, email, phone, subject, message }
}
