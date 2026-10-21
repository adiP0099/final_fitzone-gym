import { ArrowUpRight, Check, CreditCard, Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  memberships,
  payments,
  membershipRequests,
  trainers,
  userProfiles,
} from '../services/firestore/index.js'

function useServiceState(subscribe) {
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

function Heading({ title, text, action }) {
  return <div className="dash-heading"><div><p className="eyebrow">MEMBER SPACE / FIRESTORE</p><h2>{title}</h2>{text && <p>{text}</p>}</div>{action}</div>
}

function Stat({ icon: Icon, label, value, detail }) {
  return <article className="dash-stat"><span><Icon size={19} /></span><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>
}

function Table({ columns, rows, empty = 'No records are available for this account.' }) {
  return <div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={row.id || i}>{row.cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length} className="table-empty">{empty}</td></tr>}</tbody></table></div>
}

function DataMessage({ state, empty, children }) {
  if (state.loading) return <p className="member-data-message" role="status" aria-live="polite">Loading your data…</p>
  if (state.error) return <p className="member-data-message error" role="alert">{state.error.message || 'This data is currently unavailable. Please try again later.'}</p>
  if (state.empty) return <p className="member-data-message">{empty}</p>
  return children
}

function formatDate(value, options = { dateStyle: 'medium' }) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  return date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat(undefined, options).format(date) : '—'
}

function membershipStatus(record) {
  const endAt = record.endAt?.toDate ? record.endAt.toDate() : record.endAt
  if (record.status === 'active' && endAt instanceof Date && endAt <= new Date()) return 'expired'
  return record.status || '—'
}

function formatPrice(amountMinor, currency) {
  if (!Number.isSafeInteger(amountMinor) || typeof currency !== 'string') return 'Price unavailable'
  try {
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    const minorUnit = formatter.resolvedOptions().maximumFractionDigits
    return formatter.format(amountMinor / (10 ** minorUnit))
  } catch {
    return `${amountMinor} ${currency}`
  }
}

export default function MemberPages({ page }) {
  if (page === 'overview') return <OverviewPage />
  if (page === 'profile') return <ProfilePage />
  if (page === 'membership') return <MembershipPage />
  if (page === 'plans') return <PlansPage />
  if (page === 'trainers') return <TrainersPage />
  return <PaymentsPage />
}

function OverviewPage() {
  const { user } = useAuth()
  const membershipState = useServiceState(memberships.watchMyMemberships)
  const profileState = useServiceState(userProfiles.watchMyProfile)
  const trainerState = useServiceState(trainers.watchActiveTrainers)
  const firstName = user?.displayName?.trim().split(/\s+/)[0] || 'there'
  const activeMembership = membershipState.data?.find((item) => membershipStatus(item) === 'active')
  const selectedTrainerId = profileState.data?.selectedTrainerId
  const selectedTrainer = trainerState.data?.find((trainer) => trainer.id === selectedTrainerId)
  const selectedTrainerName = selectedTrainer?.displayName || 'Trainer'
  const selectedTrainerInitials = selectedTrainerName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

  return <>
    <Heading title={`Welcome, ${firstName}.`} text="Your membership activity and records, when available." />
    <div className="stat-grid">
      <Stat icon={CreditCard} label="MEMBERSHIP" value={membershipState.loading ? '…' : membershipState.error ? 'Unavailable' : activeMembership ? 'Active' : '—'} detail={membershipState.error ? 'Could not load membership' : activeMembership ? `Plan · ${activeMembership.planName || activeMembership.planId || 'Not specified'}` : 'No active membership record'} />
    </div>
    <div className="dash-columns">
      <section className="trainer-card">
        {selectedTrainer && <div className={`trainer-art trainer-ember${selectedTrainer.profileImageUrl ? ' trainer-art-photo' : ''}`} aria-hidden="true"><span>{selectedTrainerInitials}</span><i />{selectedTrainer.profileImageUrl && <img className="trainer-art-image" src={selectedTrainer.profileImageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}</div>}
        <div className="trainer-card-copy"><div><p className="eyebrow">MY TRAINER</p><h3>{selectedTrainer ? selectedTrainerName : 'Trainer selection'}</h3></div><Dumbbell size={19} />
          {profileState.loading || trainerState.loading
            ? <p className="member-data-message" role="status">Loading trainer details…</p>
            : profileState.error
              ? <p className="member-data-message error" role="alert">{profileState.error.message || 'Your trainer selection could not be loaded.'}</p>
              : profileState.empty || !selectedTrainerId
                ? <><p className="member-data-message">No trainer selected yet.</p>{profileState.empty && <p className="trainer-experience">Create your member profile before selecting a trainer.</p>}<Link className="button button-outline" to="/member/trainers">Choose a trainer</Link></>
                : trainerState.error
                  ? <p className="member-data-message error" role="alert">{trainerState.error.message || 'Trainer details could not be loaded.'}</p>
                  : !selectedTrainer
                    ? <><p className="member-data-message">Your selected trainer is unavailable right now.</p><Link className="button button-outline" to="/member/trainers">Choose another trainer</Link></>
                    : <>
                      <p>{(selectedTrainer.specializations || []).join(' · ') || 'Specialization not listed'}</p>
                      {selectedTrainer.bio && <p>{selectedTrainer.bio}</p>}
                      <p className="trainer-experience">{Number.isInteger(selectedTrainer.experienceYears) ? `${selectedTrainer.experienceYears} years of experience` : 'Experience not listed'} · Selected for your profile</p>
                    </>}
        </div>
      </section>
      <section className="panel membership-panel">
        <p className="eyebrow">MEMBERSHIP RECORD</p>
        <DataMessage state={membershipState} empty="No membership records are associated with your account.">
          {activeMembership ? <>
            <h3>{activeMembership.planName || activeMembership.planId || 'Membership'}</h3>
            <span className="plan-status">{membershipStatus(activeMembership).toUpperCase()}</span>
            <p className="sample-caption">Payment status: {activeMembership.paymentStatus || 'Not recorded'}. Approval does not process payment.</p>
            <Link className="text-link" to="/member/membership">View membership details <ArrowUpRight size={16} /></Link>
          </> : <p className="member-data-message">No active membership record is available.</p>}
        </DataMessage>
      </section>
    </div>
  </>
}

function ProfilePage() {
  const { user } = useAuth()
  const state = useServiceState(userProfiles.watchMyProfile)
  const [form, setForm] = useState({ displayName: '', phone: '', location: '' })
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    setForm({
      displayName: state.data?.displayName || user?.displayName || '',
      phone: state.data?.phone || '',
      location: state.data?.location || '',
    })
  }, [state.data, user])

  async function saveProfile(event) {
    event.preventDefault()
    setBusy(true)
    setFeedback(null)
    try {
      const input = {
        displayName: form.displayName,
        phone: form.phone,
        location: form.location,
      }
      if (state.empty) await userProfiles.createMyProfile(input)
      else await userProfiles.updateMyProfile(input)
      setFeedback({ type: 'success', text: 'Your profile was saved.' })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Your profile could not be saved. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return <>
    <Heading title="My profile" text="Your profile is linked to your signed-in FitZone account." />
    {state.loading ? <div className="panel"><DataMessage state={state} /></div>
      : state.error ? <div className="panel"><DataMessage state={state} /></div>
        : <div className="panel profile-panel">
          {state.empty && <p className="member-data-message">No profile document exists yet. You can create your own member profile.</p>}
          <form className="form-grid" onSubmit={saveProfile}>
            <label>Full name<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required minLength={1} maxLength={100} autoComplete="name" /></label>
            <label>Email address<input type="email" value={user?.email || ''} readOnly autoComplete="email" /></label>
            <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={40} autoComplete="tel" /></label>
            <label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={200} autoComplete="address-level2" /></label>
            <button className="button button-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : state.empty ? 'Create profile' : 'Save profile'}</button>
            {feedback && <p className={`form-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
          </form>
        </div>}
  </>
}

function MembershipPage() {
  const state = useServiceState(memberships.watchMyMemberships)
  return <>
    <Heading title="My membership" text="Approved requests activate your membership immediately. Payment remains unpaid until a payment workflow is available." action={<Link className="button button-outline" to="/member/plans">View plans <ArrowUpRight size={16} /></Link>} />
    <section className="panel">
      <DataMessage state={state} empty="No membership records are associated with your account.">
        <Table columns={['PLAN', 'START', 'END', 'STATUS', 'PAYMENT STATUS']} rows={(state.data || []).map((item) => ({ id: item.id, cells: [item.planName || item.planId || '—', formatDate(item.startAt), formatDate(item.endAt), membershipStatus(item), item.paymentStatus || '—'] }))} />
      </DataMessage>
    </section>
  </>
}

function PlansPage() {
  const state = useServiceState(memberships.watchActivePlans)
  const requestsState = useServiceState(membershipRequests.watchMyRequests)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function submitRequest() {
    if (!selectedPlan || submitting) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const result = await membershipRequests.createMyRequest(selectedPlan.id)
      if (result.status === 'duplicate') {
        setFeedback({ type: 'success', text: 'You already have a pending request for this plan.' })
      } else if (result.status === 'already-approved') {
        setFeedback({ type: 'success', text: 'A request for this plan has already been approved.' })
      } else if (result.status === 'already-rejected') {
        setFeedback({ type: 'success', text: 'This plan already has a rejected request. Contact FitZone if you need it reconsidered.' })
      } else {
        setFeedback({ type: 'success', text: 'Your membership request was submitted and is pending admin review.' })
      }
      setSelectedPlan(null)
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Your membership request could not be submitted.' })
    } finally {
      setSubmitting(false)
    }
  }

  return <>
    <Heading title="Membership plans" text="Choose an active plan and submit it for administrator review. Approval activates membership; it does not process payment." />
    <DataMessage state={state} empty="There are no active plans available right now.">
      <div className="plans-grid">{(state.data || []).map((plan) => <article className="plan-card" key={plan.id}>
        <p className="plan-kicker">{Number.isInteger(plan.durationDays) ? `${plan.durationDays} days` : 'Duration unavailable'}</p>
        <h3>{plan.name}</h3><p className="plan-note">{plan.description}</p>
        <p className="plan-price">{formatPrice(plan.priceMinor, plan.currency)}</p>
        <button className="button button-primary" type="button" onClick={() => { setSelectedPlan(plan); setFeedback(null) }}>Request membership</button>
        <button className="button button-outline" type="button" disabled>Online enquiries unavailable</button>
        <ul>{(plan.benefits || []).map((benefit, index) => <li key={`${plan.id}-${index}`}><Check size={16} />{benefit}</li>)}</ul>
        <p className="sample-caption">Submitting requests review only. No payment is processed.</p>
      </article>)}</div>
    </DataMessage>
    {selectedPlan && <section className="panel request-confirmation" aria-labelledby="request-confirm-title">
      <p className="eyebrow">CONFIRM YOUR SELECTION</p>
      <h3 id="request-confirm-title">{selectedPlan.name}</h3>
      <p>{selectedPlan.description}</p>
      <p><strong>{Number.isInteger(selectedPlan.durationDays) ? `${selectedPlan.durationDays} days` : 'Duration unavailable'}</strong> · <strong>{formatPrice(selectedPlan.priceMinor, selectedPlan.currency)}</strong></p>
      <p className="sample-caption">This submits a request for admin review. It does not charge you or mark payment as complete.</p>
      <div className="form-actions">
        <button className="button button-outline" type="button" onClick={() => setSelectedPlan(null)} disabled={submitting}>Cancel</button>
        <button className="button button-primary" type="button" onClick={submitRequest} disabled={submitting} aria-busy={submitting}>{submitting ? 'Submitting…' : 'Confirm request'}</button>
      </div>
    </section>}
    {feedback && <p className={`form-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <section className="panel">
      <div className="panel-heading"><div><h3>My membership requests</h3><p>Request status updates appear here</p></div></div>
      <DataMessage state={requestsState} empty="You have not submitted any membership requests.">
        <Table columns={['PLAN', 'REQUESTED', 'STATUS', 'REVIEW']} rows={(requestsState.data || []).map((request) => ({
          id: request.id,
          cells: [
            request.planSnapshot?.name || request.planId || '—',
            formatDate(request.requestedAt),
            request.status?.replaceAll('_', ' ') || '—',
            request.status === 'rejected' ? request.rejectionReason || 'No reason provided' : request.status === 'approved' ? 'Membership activated; payment unpaid' : 'Awaiting admin review',
          ],
        }))} />
      </DataMessage>
    </section>
  </>
}

function TrainersPage() {
  const state = useServiceState(trainers.watchActiveTrainers)
  const profileState = useServiceState(userProfiles.watchMyProfile)
  const [selection, setSelection] = useState({ savingId: null, error: null, success: '' })
  const selectedTrainerId = profileState.data?.selectedTrainerId
  const selectedTrainer = state.data?.find((trainer) => trainer.id === selectedTrainerId)

  async function selectTrainer(trainer) {
    setSelection({ savingId: trainer.id, error: null, success: '' })
    try {
      const result = await userProfiles.selectTrainerForMyProfile(trainer.id)
      setSelection({
        savingId: null,
        error: null,
        success: result.alreadySelected
          ? `${trainer.displayName} is already your selected trainer.`
          : `You selected ${trainer.displayName}. This does not create a booking or payment.`,
      })
    } catch (error) {
      setSelection({
        savingId: null,
        error: error.message || 'Your trainer selection could not be saved.',
        success: '',
      })
    }
  }

  return <>
    <Heading title="Meet your coaches" text="Choose an active trainer. Your selection does not create a booking or payment." />
    {profileState.loading && <p className="member-data-message" role="status">Loading your trainer selection…</p>}
    {profileState.error && <p className="member-data-message error" role="alert">{profileState.error.message || 'Your trainer selection could not be loaded.'}</p>}
    {!profileState.loading && !profileState.error && profileState.empty && <p className="member-data-message error" role="alert">Your member profile is unavailable, so a trainer cannot be selected.</p>}
    {selection.error && <p className="member-data-message error" role="alert">{selection.error}</p>}
    {selection.success && <p className="member-data-message" role="status">{selection.success}</p>}
    {selectedTrainerId && <section className="panel trainer-selection-panel">
      <div className="panel-heading"><div><h3>Your selected trainer</h3><p>Saved to your member profile</p></div><Dumbbell size={20} /></div>
      {selectedTrainer
        ? <p><strong>{selectedTrainer.displayName}</strong> · {(selectedTrainer.specializations || []).join(', ') || 'FitZone coach'}</p>
        : <p className="member-data-message">Your previously selected trainer is no longer active or available. You can choose another active trainer below.</p>}
    </section>}
    <DataMessage state={state} empty="No active trainer profiles are available right now.">
      <div className="trainer-grid trainer-grid-page">{(state.data || []).map((trainer, index) => {
        const name = trainer.displayName || 'Trainer'
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
        const isSelected = trainer.id === selectedTrainerId
        return <article className="trainer-card" key={trainer.id}>
          <div className={`trainer-art trainer-${['ember', 'olive', 'slate'][index % 3]}${trainer.profileImageUrl ? ' trainer-art-photo' : ''}`} aria-hidden="true"><span>{initials}</span><i />{trainer.profileImageUrl && <img className="trainer-art-image" src={trainer.profileImageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}</div>
          <div className="trainer-card-copy"><div><p className="eyebrow">{(trainer.specializations || []).join(' · ') || 'FitZone coach'}</p><h3>{name}</h3></div><Dumbbell size={19} /><p>{trainer.bio || 'Trainer biography not provided.'}</p>
            <p className="trainer-experience">{Number.isInteger(trainer.experienceYears) ? `${trainer.experienceYears} years of experience` : 'Experience not listed'}</p>
            <button className={`button ${isSelected ? 'button-outline' : 'button-primary'}`} type="button" onClick={() => selectTrainer(trainer)} disabled={Boolean(selection.savingId) || isSelected || profileState.loading || profileState.error || profileState.empty} aria-busy={selection.savingId === trainer.id}>
              {selection.savingId === trainer.id ? 'Saving…' : isSelected ? 'Currently selected' : 'Select trainer'}
            </button>
          </div>
        </article>
      })}</div>
    </DataMessage>
  </>
}

function PaymentsPage() {
  const state = useServiceState(payments.watchMyPayments)
  return <>
    <Heading title="Payment history" text="These are payment records only. No payment is processed here, and a record is not proof of a completed transaction." />
    <section className="panel">
      <DataMessage state={state} empty="No payment records are associated with your account.">
        <Table columns={['DATE', 'AMOUNT', 'STATUS', 'MEMBERSHIP REFERENCE']} rows={(state.data || []).map((record) => ({ id: record.id, cells: [formatDate(record.createdAt), formatPrice(record.amountMinor, record.currency), record.status || '—', record.membershipId || '—'] }))} />
      </DataMessage>
      {!state.loading && !state.error && !state.empty && <p className="member-data-message">Payment status is displayed as recorded; this page cannot confirm, create, or alter payments.</p>}
    </section>
  </>
}
