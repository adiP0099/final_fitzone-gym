import { useEffect, useState } from 'react'
import SectionHeading from '../components/SectionHeading.jsx'
import PlanCard from '../components/PlanCard.jsx'
import { memberships } from '../services/firestore/index.js'

export default function PlansPage() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => memberships.watchActivePlans(setState), [])

  return <main className="page-main"><section className="page-hero page-hero-short"><div className="container"><p className="eyebrow">MEMBERSHIP / YOUR PACE</p><h1>Make room for<br /><em>your progress.</em></h1><p>Clear, flexible membership options. Find a starting point that feels right.</p></div></section>
    <section className="section-pad"><div className="container"><SectionHeading eyebrow="MEMBERSHIP OPTIONS" title={<>Choose what <em>fits.</em></>} text="Explore FitZone membership plans currently open to new requests."/>
      {state.loading ? <p className="member-data-message" role="status">Loading membership plans…</p>
        : state.error ? <p className="member-data-message error" role="alert">{state.error.message || 'Membership plans could not be loaded.'}</p>
          : state.empty ? <p className="member-data-message">There are no active membership plans available right now.</p>
            : <div className="plans-grid">{state.data.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>}
    </div></section></main>
}
