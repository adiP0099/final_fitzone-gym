import { useEffect, useMemo, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { trainers } from '../services/firestore/index.js'

function useTrainerState() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => trainers.watchAllTrainersForAdmin(setState), [])

  return state
}

function displayValue(value) {
  return typeof value === 'string' && value.trim() ? value : '—'
}

function formatAvailability(availability) {
  if (!availability || typeof availability !== 'object' || Array.isArray(availability)) return '—'
  const entries = Object.entries(availability)
  return entries.length
    ? entries.map(([day, times]) => `${day}: ${Array.isArray(times) ? times.join(', ') : String(times)}`).join(' · ')
    : 'Not specified'
}

export default function AdminTrainers() {
  const state = useTrainerState()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTrainer, setEditingTrainer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [privateLoading, setPrivateLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [pendingDeactivate, setPendingDeactivate] = useState(null)
  const allTrainers = state.data || []
  const visibleTrainers = useMemo(() => allTrainers.filter((trainer) => (
    `${trainer.displayName || ''} ${trainer.bio || ''} ${(trainer.specializations || []).join(' ')}`
      .toLowerCase()
      .includes(search.toLowerCase())
    && (statusFilter === 'All statuses' || (trainer.active ? 'Active' : 'Inactive') === statusFilter)
  )).sort((first, second) => (
    displayValue(first.displayName).localeCompare(displayValue(second.displayName))
  )), [allTrainers, search, statusFilter])

  function openNewForm() {
    setEditingTrainer(null)
    setFormOpen(true)
    setFeedback(null)
  }

  async function openEditForm(trainer) {
    setPrivateLoading(true)
    setFeedback(null)
    try {
      const result = await trainers.getTrainerPrivateForAdmin(trainer.id)
      setEditingTrainer({
        ...trainer,
        email: result.data?.email || '',
        phone: result.data?.phone || '',
      })
      setFormOpen(true)
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Trainer contact details could not be loaded.' })
    } finally {
      setPrivateLoading(false)
    }
  }

  function closeForm() {
    if (busy) return
    setFormOpen(false)
    setEditingTrainer(null)
  }

  async function saveTrainer(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity() || busy) return
    const values = new FormData(form)
    const input = {
      displayName: String(values.get('displayName') || '').trim(),
      email: String(values.get('email') || '').trim(),
      phone: String(values.get('phone') || '').trim(),
      specializations: String(values.get('specializations') || '').split(',').map((value) => value.trim()).filter(Boolean),
      experienceYears: Number(values.get('experienceYears')),
      bio: String(values.get('bio') || '').trim(),
      profileImageUrl: String(values.get('profileImageUrl') || '').trim(),
      active: values.get('active') === 'true',
      availability: editingTrainer?.availability || {},
    }

    setBusy(true)
    setFeedback(null)
    try {
      if (editingTrainer) {
        await trainers.updateTrainerForAdmin(editingTrainer.id, input)
        setFeedback({ type: 'success', text: `${input.displayName} was updated.` })
      } else {
        await trainers.createTrainerForAdmin(input)
        setFeedback({ type: 'success', text: `${input.displayName} was added.` })
      }
      setFormOpen(false)
      setEditingTrainer(null)
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The trainer could not be saved.' })
    } finally {
      setBusy(false)
    }
  }

  async function setTrainerStatus(trainer, active) {
    setBusy(true)
    setFeedback(null)
    try {
      await trainers.updateTrainerStatusForAdmin(trainer.id, active)
      setFeedback({
        type: 'success',
        text: `${trainer.displayName || 'Trainer'} was ${active ? 'activated' : 'deactivated'}.`,
      })
      setPendingDeactivate(null)
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The trainer status could not be updated.' })
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="dash-heading"><div><p className="eyebrow">ADMIN WORKSPACE</p><h2>Trainer management</h2><p>Manage public profiles and private trainer contact details.</p></div></div>
    {feedback && <p className={`form-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <div className="admin-toolbar">
      <label className="search-label">Search trainers<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search trainer profiles..." /></label>
      <label className="filter-label">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Active</option><option>Inactive</option></select></label>
      <button className="button button-primary" type="button" onClick={formOpen ? closeForm : openNewForm} disabled={busy || privateLoading}>{formOpen ? 'Cancel' : '+ Add trainer'}</button>
    </div>
    {privateLoading && <p className="member-data-message" role="status">Loading private trainer contact details…</p>}
    {formOpen && <form key={editingTrainer?.id || 'new-trainer'} className="panel admin-add-form" onSubmit={saveTrainer}>
      <h3>{editingTrainer ? 'Edit trainer' : 'Add trainer'}</h3>
      <div className="form-grid">
        <label>Full name<input name="displayName" defaultValue={editingTrainer?.displayName || ''} autoComplete="name" required maxLength={100} /></label>
        <label>Private email<input name="email" type="email" defaultValue={editingTrainer?.email || ''} autoComplete="email" required maxLength={254} /></label>
        <label>Phone number (optional)<input name="phone" type="tel" defaultValue={editingTrainer?.phone || ''} autoComplete="tel" maxLength={40} /></label>
        <label>Specialization<input name="specializations" defaultValue={editingTrainer?.specializations?.join(', ') || ''} placeholder="Strength, mobility" required maxLength={1000} /></label>
        <label>Experience (years)<input name="experienceYears" type="number" min="0" max="80" step="1" defaultValue={editingTrainer?.experienceYears ?? ''} required /></label>
        <label>Profile image URL (optional)<input name="profileImageUrl" type="url" defaultValue={editingTrainer?.profileImageUrl || ''} placeholder="https://example.com/profile.jpg" maxLength={2048} /></label>
        <label>Professional bio<textarea name="bio" defaultValue={editingTrainer?.bio || ''} required maxLength={3000} rows={4} /></label>
        <label>Status<select name="active" defaultValue={editingTrainer?.active === false ? 'false' : 'true'}><option value="true">Active</option><option value="false">Inactive</option></select></label>
      </div>
      <div className="form-actions">
        <button className="button button-outline" type="button" onClick={closeForm} disabled={busy}>Cancel</button>
        <button className="button button-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : editingTrainer ? 'Save changes' : 'Create trainer'}</button>
      </div>
      <p className="sample-caption">Email and phone are stored in a separate admin-only Firestore collection.</p>
    </form>}
    <section className="panel">
      <div className="panel-heading"><div><h3>Trainer profiles</h3><p>{visibleTrainers.length} {visibleTrainers.length === 1 ? 'trainer' : 'trainers'}</p></div><Dumbbell size={20} /></div>
      {state.loading ? <p className="member-data-message" role="status">Loading trainer profiles…</p>
        : <>
          {state.error && <p className="member-data-message error" role="alert">{state.error.message || 'Trainer profiles could not be refreshed. Previously loaded profiles are still shown.'}</p>}
          {!state.error && state.empty && <p className="member-data-message">No trainer profiles are available.</p>}
          {state.data && visibleTrainers.length === 0 && !state.empty && <p className="member-data-message">No trainers match these filters.</p>}
          {visibleTrainers.length > 0 && <div className="data-table-wrap"><table className="data-table"><thead><tr><th>NAME</th><th>PROFILE</th><th>SPECIALIZATIONS</th><th>AVAILABILITY</th><th>EXPERIENCE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
                {visibleTrainers.map((trainer) => <tr key={trainer.id}>
                  <td><strong>{displayValue(trainer.displayName)}</strong><small>{trainer.id}</small></td>
                  <td>{displayValue(trainer.bio)}</td>
                  <td>{Array.isArray(trainer.specializations) && trainer.specializations.length ? trainer.specializations.join(', ') : '—'}</td>
                  <td>{formatAvailability(trainer.availability)}</td>
                  <td>{Number.isInteger(trainer.experienceYears) ? `${trainer.experienceYears} years` : '—'}</td>
                  <td><span className="status-tag">{trainer.active === true ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="table-actions">
                    <button className="table-action" type="button" onClick={() => openEditForm(trainer)} disabled={busy || privateLoading} aria-label={`Edit ${trainer.displayName || 'trainer'}`}>Edit</button>
                    {trainer.active
                      ? <><span aria-hidden="true"> · </span><button className="table-action" type="button" onClick={() => setPendingDeactivate(trainer)} disabled={busy}>Deactivate</button></>
                      : <><span aria-hidden="true"> · </span><button className="table-action" type="button" onClick={() => setTrainerStatus(trainer, true)} disabled={busy}>Activate</button></>}
                  </div></td>
                </tr>)}
              </tbody></table></div>}
        </>}
    </section>
    {pendingDeactivate && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="deactivate-trainer-title" aria-describedby="deactivate-trainer-description">
      <h3 id="deactivate-trainer-title">Deactivate this trainer?</h3>
      <p id="deactivate-trainer-description">{pendingDeactivate.displayName} will no longer appear in member trainer listings. Existing bookings and member selection records are not deleted.</p>
      <div className="form-actions"><button className="button button-outline" type="button" onClick={() => setPendingDeactivate(null)} disabled={busy}>Cancel</button><button className="button button-danger" type="button" onClick={() => setTrainerStatus(pendingDeactivate, false)} disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : 'Confirm deactivation'}</button></div>
    </section></div>}
  </>
}
