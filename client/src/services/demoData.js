export const plans = [
  { id: 'starter', name: 'Starter', period: '1 month', price: 39, note: 'A strong first step', perks: ['Gym floor access', 'Fitness orientation', 'Locker room access'] },
  { id: 'commit', name: 'Commit', period: '3 months', price: 99, note: 'Build your rhythm', perks: ['Everything in Starter', 'Group training access', 'Progress check-in'], featured: true },
  { id: 'all-in', name: 'All In', period: '12 months', price: 349, note: 'Make room for more', perks: ['Everything in Commit', 'Monthly guest pass', 'Priority class booking'] },
]

export const trainers = [
  { name: 'Jordan Hayes', specialty: 'Strength & conditioning', experience: '8 years', initials: 'JH', tone: 'ember', description: 'Build practical strength with coaching that meets you where you are.' },
  { name: 'Maya Brooks', specialty: 'Functional training', experience: '6 years', initials: 'MB', tone: 'olive', description: 'Move with confidence through focused, energetic training.' },
  { name: 'Alex Rivera', specialty: 'Mobility & performance', experience: '10 years', initials: 'AR', tone: 'slate', description: 'Find better movement and sustainable progress, one session at a time.' },
]

export const member = { name: 'Jamie Morgan', email: 'jamie@example.test', memberSince: 'January 2025', plan: 'FitZone Commit' }

export const bookings = [
  { id: 'BK-2048', className: 'Strength Foundations', date: 'Oct 16, 2026', time: '9:00 AM', coach: 'Jordan Hayes', status: 'Confirmed' },
  { id: 'BK-2051', className: 'Functional Fitness', date: 'Oct 18, 2026', time: '5:30 PM', coach: 'Maya Brooks', status: 'Waitlist' },
  { id: 'BK-2036', className: 'Mobility & Recovery', date: 'Oct 12, 2026', time: '10:00 AM', coach: 'Alex Rivera', status: 'Completed' },
]

export const adminMembers = [
  { id: 'FZ-042', name: 'Jamie Morgan', email: 'jamie@example.test', plan: 'Commit · 3 mo', status: 'Active' },
  { id: 'FZ-043', name: 'Taylor Reed', email: 'taylor@example.test', plan: 'Starter · 1 mo', status: 'Pending' },
  { id: 'FZ-044', name: 'Riley Chen', email: 'riley@example.test', plan: 'All In · 12 mo', status: 'Active' },
]

export const enquiries = [
  { id: 'EN-108', name: 'Avery Lane', subject: 'Group class schedule', status: 'New' },
  { id: 'EN-107', name: 'Noah Park', subject: 'Membership options', status: 'In review' },
]
