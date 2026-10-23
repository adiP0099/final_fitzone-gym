import { useEffect, useState } from 'react'
import { ArrowRight, Dumbbell, HeartPulse, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/PlansPage.css'
import SectionHeading from '../components/SectionHeading.jsx'
import PlanCard from '../components/PlanCard.jsx'
import { memberships } from '../services/firestore/index.js'

const inclusions = [
  { icon: Dumbbell, title: 'Modern Equipment', text: 'Full access to free weights, squat racks, barbells, and cardio machines.' },
  { icon: ShieldCheck, title: 'Clean Amenities', text: 'Private showers, daily lockers, and thoughtfully maintained locker rooms.' },
  { icon: Users, title: 'Expert Floor Coaching', text: 'Floor coaches available to help with equipment setup, safety, and form.' },
  { icon: HeartPulse, title: 'Room For Recovery', text: 'Dedicated stretching and mobility zones to warm up and recover properly.' },
]

const faqs = [
  { question: 'How does membership request work?', answer: 'Submit your request online with no upfront payment. Our team will verify your details and activate your account.' },
  { question: 'Are there hidden initiation fees?', answer: 'No surprise charges. All published rates are clear and include full access to standard gym facilities.' },
  { question: 'Can I tour the gym first?', answer: 'Absolutely! Feel free to visit during staffed hours or reach out via our contact page to arrange an orientation walkthrough.' },
]

export default function PlansPage() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => memberships.watchActivePlans(setState), [])

  return (
    <main className="page-main plans-page">
      <section className="page-hero">
        <img
          className="plans-hero-bg"
          src="/assets/plans-hero.jpg"
          alt="FitZone gym weights and equipment"
          fetchPriority="high"
        />
        <div className="plans-hero-overlay" />
        <div className="container plans-hero-container">
          <div className="plans-hero-content">
            <p className="plans-eyebrow">
              <span className="plans-eyebrow-line" />
              FIND YOUR PLAN / MEMBERSHIP
            </p>
            <h1>
              INVEST IN YOUR<br />
              <em>STRONGER SELF.</em>
            </h1>
            <p className="plans-hero-lead">
              Clear, flexible membership options designed for real progress. Choose a starting point that fits your routine and goals.
            </p>
          </div>
        </div>
      </section>

      <section className="section-pad plans-main-section">
        <div className="container">
          <SectionHeading
            eyebrow="MEMBERSHIP OPTIONS"
            title={<>Choose what <em>fits.</em></>}
            text="Explore FitZone membership plans currently open to new requests."
          />
          {state.loading ? (
            <p className="member-data-message" role="status">Loading membership plans…</p>
          ) : state.error ? (
            <p className="member-data-message error" role="alert">
              {state.error.message || 'Membership plans could not be loaded.'}
            </p>
          ) : state.empty ? (
            <p className="member-data-message">There are no active membership plans available right now.</p>
          ) : (
            <div className="plans-grid">
              {state.data.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section-pad plans-perks-section">
        <div className="container">
          <SectionHeading
            eyebrow="INCLUDED IN EVERY PLAN"
            title={<>Built for your <em>best workouts.</em></>}
            text="Every FitZone membership gives you the essentials you need to train consistently."
          />
          <div className="perks-grid">
            {inclusions.map(({ icon: Icon, title, text }) => (
              <article className="perk-card" key={title}>
                <div className="perk-icon-wrap">
                  <Icon size={24} strokeWidth={2.2} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad plans-faq-section">
        <div className="container">
          <SectionHeading
            eyebrow="COMMON QUESTIONS"
            title={<>Everything you need <em>to know.</em></>}
            text="Simple, transparent answers about our membership plans and gym experience."
          />
          <div className="faq-grid">
            {faqs.map(({ question, answer }) => (
              <article className="faq-card" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-cta plans-closing-cta">
        <div className="container closing-inner">
          <div>
            <p className="eyebrow">STILL HAVE QUESTIONS?</p>
            <h2>We're here to help you<br /><em>find your fit.</em></h2>
          </div>
          <Link to="/contact" className="button button-primary button-large">
            Contact our team <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  )
}

