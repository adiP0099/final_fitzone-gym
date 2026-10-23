import { useEffect, useState } from 'react'
import { ArrowRight, Dumbbell, HeartPulse, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/TrainersPage.css'
import SectionHeading from '../components/SectionHeading.jsx'
import TrainerCard from '../components/TrainerCard.jsx'
import { trainers } from '../services/firestore/index.js'

const standards = [
  { icon: ShieldCheck, title: 'Certified Expertise', text: 'All FitZone coaches hold nationally accredited training and movement certifications.' },
  { icon: Dumbbell, title: 'Form & Mechanics', text: 'Prioritizing joint health, safe posture, and smart progression tailored to your body.' },
  { icon: HeartPulse, title: 'Goal-Oriented Plans', text: 'Structured workouts that evolve as your strength, endurance, and habits develop.' },
  { icon: Users, title: 'Supportive Mentorship', text: 'Welcoming, ego-free guidance focused on consistency, confidence, and community.' },
]

export default function TrainersPage() {
  const [state, setState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => trainers.watchActiveTrainers(setState), [])

  return (
    <main className="page-main trainers-page">
      <section className="page-hero">
        <img
          className="trainers-hero-bg"
          src="/assets/trainers-hero.jpg"
          alt="FitZone training floor"
          fetchPriority="high"
        />
        <div className="trainers-hero-overlay" />
        <div className="container trainers-hero-container">
          <div className="trainers-hero-content">
            <p className="trainers-eyebrow">
              <span className="trainers-eyebrow-line" />
              MEET OUR EXPERTS
            </p>
            <h1>
              TRAIN WITH<br />
              THE <em>BEST.</em>
            </h1>
            <p className="trainers-hero-lead">
              Our coaches bring expert guidance, thoughtful programming, and support to every step of your training.
            </p>
          </div>
          <div className="trainers-hero-features" aria-label="Our coaching approach">
            {standards.map(({ icon: Icon, title }) => (
              <div className="trainers-hero-feature" key={title}>
                <Icon size={30} strokeWidth={1.8} aria-hidden="true" />
                <span>{title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad trainers-main-section">
        <div className="container">
          <div className="trainers-list-heading">
            <div><p className="trainers-eyebrow">MEET YOUR COACHES</p><h2>TRAINERS <em>AT FITZONE</em></h2></div>
            <p>Explore the active trainer profiles at FitZone.</p>
          </div>
          {state.loading ? (
            <p className="member-data-message" role="status">Loading active trainers…</p>
          ) : state.error ? (
            <p className="member-data-message error" role="alert">
              {state.error.message || 'Trainers could not be loaded.'}
            </p>
          ) : state.empty ? (
            <p className="member-data-message">There are no active trainer profiles available right now.</p>
          ) : (
            <div className={`trainer-grid trainers-grid-page${state.data.length <= 2 ? ' trainers-grid-page--few' : ''}`}>
              {state.data.map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section-pad trainers-standards-section">
        <div className="container">
          <SectionHeading
            eyebrow="HOW WE COACH"
            title={<>Built on <em>proven standards.</em></>}
            text="Our training philosophy combines modern sports science with personal, accessible support."
          />
          <div className="standards-grid">
            {standards.map(({ icon: Icon, title, text }) => (
              <article className="standard-card" key={title}>
                <div className="standard-icon-wrap">
                  <Icon size={24} strokeWidth={2.2} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-cta trainers-closing-cta">
        <div className="container closing-inner">
          <div>
            <p className="eyebrow">READY TO START?</p>
            <h2>LET’S TRAIN<br /><em>TOGETHER.</em></h2>
            <p className="trainers-cta-copy">Take the next step in your training with FitZone.</p>
          </div>
          <div className="trainers-closing-actions">
            <Link to="/register" className="button button-primary button-large">
              Join FitZone <ArrowRight size={18} />
            </Link>
            {/* <Link to="/contact" className="button button-outline button-large">
              Talk to a coach <ArrowRight size={18} />
            </Link> */}
          </div>
        </div>
      </section>
    </main>
  )
}

