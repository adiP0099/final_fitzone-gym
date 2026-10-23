import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, ClipboardList, CreditCard, Dumbbell, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import DemoNotice from '../components/DemoNotice.jsx'
import { bookings, membershipRequests, memberships, trainers, userProfiles } from '../services/firestore/index.js'
import AdminMembershipPlans from './AdminMembershipPlans.jsx'
import AdminMembers from './AdminMembers.jsx'
import AdminTrainers from './AdminTrainers.jsx'
import AdminPayments from './AdminPayments.jsx'
import AdminEnquiries from './AdminEnquiries.jsx'

const configs = {
  members: { title: 'Member management', icon: Users },
  trainers: { title: 'Trainer management', icon: Dumbbell },
  payments: { title: 'Payments & reporting', icon: CreditCard },
  'membership-requests': { title: 'Membership requests', icon: ClipboardList },
}

function Heading({ title, subtitle }) { return <div className="dash-heading"><div><p className="eyebrow">ADMIN WORKSPACE</p><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div> }

export default function AdminPages({ page }) {
  if (page === 'members') return <AdminMembers />
  if (page === 'trainers') return <AdminTrainers />
  if (page === 'plans') return <AdminMembershipPlans />
  if (page === 'membership-requests') return <MembershipRequestsPage />
  if (page === 'payments') return <AdminPayments />
  if (page === 'enquiries') return <AdminEnquiries />
  if (page === 'overview') return <AdminOverview />
  return null
}

const initialMetricState = {
  members: { loading: true, value: null, error: null },
  memberships: { loading: true, value: null, error: null },
  trainers: { loading: true, value: null, error: null },
  bookings: { loading: true, value: null, error: null },
}

function dateValue(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  return date && !Number.isNaN(date.valueOf()) ? date : null
}

function countCurrentMemberships(records) {
  const activeRecords = records.filter((record) => record.status === 'active')
  const endDates = activeRecords.map((record) => dateValue(record.endAt))
  if (endDates.some((endDate) => !endDate)) return null
  const now = Date.now()
  return endDates.filter((endDate) => endDate.valueOf() > now).length
}

function AdminOverview() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState(initialMetricState)

  useEffect(() => {
    let active = true
    const loadMetric = async (key, read, count) => {
      try {
        const { data } = await read()
        if (active) setMetrics((current) => ({
          ...current,
          [key]: { loading: false, value: count(data), error: null },
        }))
      } catch (error) {
        if (active) setMetrics((current) => ({
          ...current,
          [key]: { loading: false, value: null, error },
        }))
      }
    }

    loadMetric('members', () => userProfiles.getAllProfilesForAdmin(), (profiles) => (
      profiles.filter((profile) => profile.role === 'member').length
    ))
    loadMetric('memberships', () => memberships.getAllMembershipsForAdmin(), countCurrentMemberships)
    loadMetric('trainers', () => trainers.getAllTrainersForAdmin(), (records) => records.length)
    loadMetric('bookings', () => bookings.getAllBookingsForAdmin(), (records) => records.length)

    return () => { active = false }
  }, [])

  const greeting = user?.displayName?.trim()
    ? `Welcome, ${user.displayName.trim()}.`
    : 'Welcome to FitZone.'
  const cards = [
    { key: 'members', label: 'TOTAL MEMBERS', icon: Users, description: 'Member profiles in Firestore' },
    { key: 'memberships', label: 'ACTIVE MEMBERSHIPS', icon: CreditCard, description: 'Unexpired active memberships' },
    { key: 'trainers', label: 'TRAINERS', icon: Dumbbell, description: 'Trainer profiles in Firestore' },
    // { key: 'bookings', label: 'BOOKINGS', icon: CalendarDays, description: 'Booking records in Firestore' },
  ]

  return <>
    <div className="dash-heading"><div><p className="eyebrow">ADMIN WORKSPACE</p><h2>{greeting}</h2><p>Current FitZone records and workspace access.</p></div></div>
    <div className="admin-stat-grid">{cards.map(({ key, label, icon: Icon, description }) => {
      const metric = metrics[key]
      const value = metric.loading ? '…' : metric.value === null ? 'Unavailable' : metric.value
      const detail = metric.loading
        ? 'Loading Firestore data'
        : metric.value === null
          ? 'Could not be computed from available data'
          : metric.value === 0
            ? 'No records found'
            : description
      return <article className="dash-stat" key={key}><span><Icon size={19}/></span><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>
    })}</div>
    <section className="panel"><div className="panel-heading"><div><h3>Quick access</h3><p>Open an admin workspace</p></div></div><div className="quick-links">{Object.entries(configs).map(([key, config]) => <Link to={`/admin/${key}`} key={key}><config.icon size={18}/>{config.title}<ArrowUpRight size={16}/></Link>)}</div></section>
  </>
}

function useRequestState(subscribe) {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => {
    let unsubscribe = () => {}
    try {
      unsubscribe = subscribe(setState) || unsubscribe
    } catch (error) {
      setState({ loading: false, data: null, empty: false, error })
    }
    return () => unsubscribe()
  }, [subscribe])

  return state
}

function requestDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '—'
}

function requestPrice(request) {
  const { priceMinor, currency } = request.planSnapshot || {}
  if (!Number.isSafeInteger(priceMinor) || typeof currency !== 'string') return 'Price unavailable'
  try {
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    return formatter.format(priceMinor / (10 ** formatter.resolvedOptions().maximumFractionDigits))
  } catch {
    return `${priceMinor} ${currency}`
  }
}

function requestPlanName(request, planNames) {
  const snapshotName = request.planSnapshot?.name
  if (typeof snapshotName === 'string' && snapshotName.trim()) return snapshotName
  const currentPlanName = planNames.get(request.planId)
  return typeof currentPlanName === 'string' && currentPlanName.trim()
    ? currentPlanName
    : 'Plan details unavailable'
}

function MembershipRequestsPage() {
  const state = useRequestState(membershipRequests.watchPendingForAdmin)
  const plansState = useRequestState(memberships.watchAllPlansForAdmin)
  const [activeAction, setActiveAction] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const planNames = new Map((plansState.data || []).map((plan) => [plan.id, plan.name]))

  async function confirmReview() {
    if (!activeAction || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const result = await membershipRequests.reviewRequestForAdmin({
        memberUid: activeAction.memberUid,
        requestId: activeAction.id,
        decision: activeAction.decision,
        rejectionReason,
      })
      setFeedback({
        type: 'success',
        text: result.status === 'already-reviewed'
          ? 'This request was already reviewed by another administrator.'
          : activeAction.decision === 'approved'
            ? 'Membership approved and activated. Payment remains unpaid.'
            : 'Membership request rejected. No membership was created.',
      })
      setActiveAction(null)
      setRejectionReason('')
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The request could not be reviewed.' })
    } finally {
      setBusy(false)
    }
  }

  const requests = [...(state.data || [])].sort((first, second) => {
    const firstDate = first.requestedAt?.toMillis?.() || 0
    const secondDate = second.requestedAt?.toMillis?.() || 0
    return firstDate - secondDate
  })

  return <>
    <Heading title="Membership requests" subtitle="Review pending requests. Only Firebase Auth users with the trusted admin claim can read or decide these records." />
    <DemoNotice>Membership request decisions are authorized by the Firebase Auth admin claim and Firestore Rules.</DemoNotice>
    {feedback && <p className={`form-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <section className="panel">
      <div className="panel-heading"><div><h3>Pending review</h3><p>{requests.length} pending {requests.length === 1 ? 'request' : 'requests'}</p></div><ClipboardList size={20} /></div>
      {state.loading ? <p className="member-data-message" role="status">Loading pending membership requests…</p>
        : state.error ? <p className="member-data-message error" role="alert">{state.error.message || 'Membership requests could not be loaded.'}</p>
          : state.empty ? <p className="member-data-message">There are no pending membership requests.</p>
            : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>MEMBER</th><th>REQUESTED PLAN</th><th>REQUEST DATE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
              {requests.map((request) => <tr key={`${request.memberUid}-${request.id}`}>
                <td><strong>{request.memberName || 'Member'}</strong><small>{request.memberEmail || request.memberUid}</small></td>
                <td><strong>{requestPlanName(request, planNames)}</strong><small>{requestPrice(request)} · {request.planSnapshot?.durationDays || '—'} days</small><small>{request.planSnapshot?.description}</small><small>{request.planSnapshot?.benefits?.join(' · ') || 'No benefits listed'}</small></td>
                <td>{requestDate(request.requestedAt)}</td>
                <td><span className="status-tag">Pending review</span></td>
                <td><div className="request-review-actions">
                  <button className="table-action" type="button" onClick={() => { setActiveAction({ ...request, decision: 'approved' }); setRejectionReason(''); setFeedback(null) }}>Approve</button>
                  <button className="table-action" type="button" onClick={() => { setActiveAction({ ...request, decision: 'rejected' }); setRejectionReason(''); setFeedback(null) }}>Reject</button>
                </div></td>
              </tr>)}
            </tbody></table></div>}
    </section>
    {activeAction && <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="request-review-title" aria-describedby="request-review-description">
        <h3 id="request-review-title">{activeAction.decision === 'approved' ? 'Approve membership request?' : 'Reject membership request?'}</h3>
        <p id="request-review-description">{activeAction.memberName} · {requestPlanName(activeAction, planNames)}. {activeAction.decision === 'approved' ? 'Approval activates the membership immediately. Payment remains unpaid.' : 'A rejected request will not create a membership.'}</p>
        {activeAction.decision === 'rejected' && <label className="request-rejection-reason">Rejection reason (optional)<textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={1000} rows={3} /></label>}
        <div className="form-actions">
          <button className="button button-outline" type="button" onClick={() => setActiveAction(null)} disabled={busy}>Cancel</button>
          <button className={activeAction.decision === 'approved' ? 'button button-primary' : 'button button-danger'} type="button" onClick={confirmReview} disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : activeAction.decision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}</button>
        </div>
      </section>
    </div>}
  </>
}
