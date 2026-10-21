import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { memberships } from '../services/firestore/index.js'
import { formatPlanPrice, minorUnitsToPriceInput, parsePriceToMinorUnits } from '../services/planPricing.js'

function usePlanState(subscribe) {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => {
    let unsubscribe = () => {}
    try {
      unsubscribe = subscribe(setState) || unsubscribe
    } catch (error) {
      setState({ loading: false, data: null, empty: false, error })
    }
    return unsubscribe
  }, [subscribe])

  return state
}

export default function AdminMembershipPlans() {
  const state = usePlanState(memberships.watchAllPlansForAdmin)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All statuses')
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [pendingDeactivate, setPendingDeactivate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const plans = state.data || []
  const statuses = [...new Set(plans.map((plan) => plan.active ? 'Active' : 'Inactive'))]
  const visiblePlans = plans.filter((plan) => (
    `${plan.name} ${plan.description} ${plan.id}`.toLowerCase().includes(search.toLowerCase())
    && (filter === 'All statuses' || (plan.active ? 'Active' : 'Inactive') === filter)
  ))

  function openForm(plan = null) {
    setEditingPlan(plan)
    setShowForm(true)
    setFeedback(null)
  }

  function closeForm() {
    if (busy) return
    setShowForm(false)
    setEditingPlan(null)
  }

  async function savePlan(event) {
    event.preventDefault()
    if (busy || !event.currentTarget.reportValidity()) return

    const form = new FormData(event.currentTarget)
    const currency = String(form.get('currency') || '').trim().toUpperCase()
    let input
    try {
      input = {
        name: String(form.get('name') || '').trim(),
        description: String(form.get('description') || '').trim(),
        durationDays: Number(form.get('durationDays')),
        priceMinor: parsePriceToMinorUnits(form.get('price'), currency),
        currency,
        benefits: String(form.get('benefits') || '')
          .split(/\r?\n/)
          .map((benefit) => benefit.trim())
          .filter(Boolean),
        active: form.get('active') === 'true',
      }
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Enter a valid plan price.' })
      return
    }

    setBusy(true)
    setFeedback(null)
    try {
      if (editingPlan) {
        await memberships.updatePlanForAdmin(editingPlan.id, input)
        setFeedback({ type: 'success', text: `${input.name} was updated.` })
      } else {
        await memberships.createPlanForAdmin(input)
        setFeedback({ type: 'success', text: `${input.name} was created.` })
      }
      setShowForm(false)
      setEditingPlan(null)
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The membership plan could not be saved.' })
    } finally {
      setBusy(false)
    }
  }

  async function deactivatePlan() {
    if (!pendingDeactivate || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      await memberships.updatePlanForAdmin(pendingDeactivate.id, {
        name: pendingDeactivate.name,
        description: pendingDeactivate.description,
        durationDays: pendingDeactivate.durationDays,
        priceMinor: pendingDeactivate.priceMinor,
        currency: pendingDeactivate.currency,
        benefits: pendingDeactivate.benefits,
        active: false,
      })
      setFeedback({ type: 'success', text: `${pendingDeactivate.name} was deactivated.` })
      setPendingDeactivate(null)
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'The membership plan could not be deactivated.' })
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="dash-heading"><div><p className="eyebrow">ADMIN WORKSPACE</p><h2>Membership plans</h2><p>Manage plans published to members. Deactivated plans remain on record.</p></div></div>
    {feedback && <p className={`form-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <div className="admin-toolbar">
      <label className="search-label">Search plans<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans..." /></label>
      <label className="filter-label">Status<select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      <button className="button button-primary" type="button" onClick={() => showForm ? closeForm() : openForm()} disabled={busy}>{showForm ? 'Cancel' : '+ Add plan'}</button>
    </div>
    {showForm && <form key={editingPlan?.id || 'new-plan'} className="panel admin-add-form" onSubmit={savePlan}>
      <h3>{editingPlan ? 'Edit plan' : 'Add plan'}</h3>
      <div className="form-grid">
        <label>Plan name<input name="name" defaultValue={editingPlan?.name || ''} required maxLength={100} /></label>
        <label>Description<textarea name="description" defaultValue={editingPlan?.description || ''} required maxLength={2000} rows={3} /></label>
        <label>Duration (days)<input name="durationDays" type="number" min="1" max="36500" step="1" defaultValue={editingPlan?.durationDays || ''} required /></label>
        <label>Price<input name="price" type="text" inputMode="decimal" defaultValue={editingPlan ? minorUnitsToPriceInput(editingPlan.priceMinor, editingPlan.currency) : ''} placeholder="39.00" required /></label>
        <label>Currency<input name="currency" defaultValue={editingPlan?.currency || 'USD'} pattern="[A-Za-z]{3}" title="Enter a three-letter currency code, such as USD." required maxLength={3} /></label>
        <label>Benefits (one per line)<textarea name="benefits" defaultValue={editingPlan?.benefits.join('\n') || ''} rows={4} /></label>
        <label>Status<select name="active" defaultValue={editingPlan?.active === false ? 'false' : 'true'}><option value="true">Active</option><option value="false">Inactive</option></select></label>
      </div>
      <div className="form-actions">
        <button className="button button-outline" type="button" onClick={closeForm} disabled={busy}>Cancel</button>
        <button className="button button-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : editingPlan ? 'Save changes' : 'Create plan'}</button>
      </div>
      <p className="sample-caption">Prices are entered in the selected currency and stored as integer minor units.</p>
    </form>}
    <section className="panel">
      <div className="panel-heading"><div><h3>Membership plans</h3><p>{visiblePlans.length} {visiblePlans.length === 1 ? 'plan' : 'plans'}</p></div><CreditCard size={20} /></div>
      {state.loading ? <p className="member-data-message" role="status">Loading membership plans…</p>
        : state.error ? <p className="member-data-message error" role="alert">{state.error.message || 'Membership plans could not be loaded.'}</p>
          : state.empty ? <p className="member-data-message">No membership plans have been created.</p>
            : visiblePlans.length === 0 ? <p className="member-data-message">No plans match these filters.</p>
              : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>PLAN</th><th>DETAILS</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
                {visiblePlans.map((plan) => <tr key={plan.id}>
                  <td><strong>{plan.name}</strong><small>{plan.id}</small></td>
                  <td>{plan.durationDays} days · {formatPlanPrice(plan.priceMinor, plan.currency)}<small>{plan.description}</small></td>
                  <td><span className="status-tag">{plan.active ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="table-actions"><button className="table-action" type="button" onClick={() => openForm(plan)} disabled={busy}>Edit</button>{plan.active && <><span aria-hidden="true"> · </span><button className="table-action" type="button" onClick={() => { setPendingDeactivate(plan); setFeedback(null) }} disabled={busy}>Deactivate</button></>}</div></td>
                </tr>)}
              </tbody></table></div>}
    </section>
    {pendingDeactivate && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="deactivate-plan-title" aria-describedby="deactivate-plan-description">
      <h3 id="deactivate-plan-title">Deactivate this plan?</h3>
      <p id="deactivate-plan-description">{pendingDeactivate.name} will no longer appear in active plan listings. Existing requests and memberships are not deleted.</p>
      <div className="form-actions"><button className="button button-outline" type="button" onClick={() => setPendingDeactivate(null)} disabled={busy}>Cancel</button><button className="button button-danger" type="button" onClick={deactivatePlan} disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : 'Confirm deactivation'}</button></div>
    </section></div>}
  </>
}
