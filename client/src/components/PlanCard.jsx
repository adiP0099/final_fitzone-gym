import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatPlanPrice } from '../services/planPricing.js'

function hasValidFirestorePrice(plan) {
  if (!Number.isSafeInteger(plan.priceMinor) || plan.priceMinor < 0
    || typeof plan.currency !== 'string' || !/^[A-Z]{3}$/.test(plan.currency)) {
    return false
  }

  try {
    new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency })
    return true
  } catch {
    return false
  }
}

export default function PlanCard({ plan, compact = false }) {
  const { loading, user } = useAuth()
  const navigate = useNavigate()
  const firestorePlan = hasValidFirestorePrice(plan)
  const period = plan.period || `${plan.durationDays} days`
  const perks = plan.perks || plan.benefits || []

  function requestMembership() {
    const destination = { pathname: '/member/plans' }
    if (user) {
      navigate(destination)
    } else if (!loading) {
      navigate('/login', { state: { from: destination } })
    }
  }

  return <article className={`plan-card${plan.featured ? ' plan-card-featured' : ''}${compact ? ' plan-card-compact' : ''}`}>
    {plan.featured && <span className="plan-ribbon">MOST POPULAR</span>}
    <p className="plan-kicker">{period}</p><h3>{plan.name}</h3><p className="plan-note">{plan.note || plan.description}</p>
    <p className="plan-price">{firestorePlan ? formatPlanPrice(plan.priceMinor, plan.currency) : 'Price unavailable'}{firestorePlan && <small> / {period}</small>}</p>
    <button className={`button ${plan.featured ? 'button-primary' : 'button-outline'}`} type="button" onClick={requestMembership} disabled={loading}>Request membership</button>
    <ul>{perks.map((perk) => <li key={perk}><Check size={16} />{perk}</li>)}</ul>
    <p className="sample-caption">{firestorePlan ? 'Published plan · No payment is processed here' : 'Price unavailable · No payment is processed here'}</p>
  </article>
}
