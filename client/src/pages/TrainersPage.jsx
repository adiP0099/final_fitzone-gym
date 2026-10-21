import { useEffect, useState } from 'react'
import SectionHeading from '../components/SectionHeading.jsx'
import TrainerCard from '../components/TrainerCard.jsx'
import { trainers } from '../services/firestore/index.js'

export default function TrainersPage() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => trainers.watchActiveTrainers(setState), [])

  return <main className="page-main"><section className="page-hero page-hero-short"><div className="container"><p className="eyebrow">COACHING / COMMUNITY</p><h1>Here for your<br /><em>next rep.</em></h1><p>Meet the coaches bringing knowledge, care, and good energy.</p></div></section><section className="section-pad"><div className="container"><SectionHeading eyebrow="YOUR TEAM, IN YOUR CORNER" title={<>Good people.<br /><em>Great coaches.</em></>} text="Explore the active trainer profiles at FitZone."/>
    {state.loading ? <p className="member-data-message" role="status">Loading active trainers…</p>
      : state.error ? <p className="member-data-message error" role="alert">{state.error.message || 'Trainers could not be loaded.'}</p>
        : state.empty ? <p className="member-data-message">There are no active trainer profiles available right now.</p>
          : <div className="trainer-grid trainer-grid-page">{state.data.map((trainer) => <TrainerCard key={trainer.id} trainer={trainer} />)}</div>}
  </div></section></main>
}
