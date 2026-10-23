import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, Dumbbell, HeartPulse, MoveUpRight, Sparkles, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/HomePage.css'
import SectionHeading from '../components/SectionHeading.jsx'
import PlanCard from '../components/PlanCard.jsx'
import TrainerCard from '../components/TrainerCard.jsx'
import { memberships, trainers } from '../services/firestore/index.js'

export default function HomePage() {
  const [trainerState, setTrainerState] = useState({ loading: true, data: null, empty: false, error: null })
  const [planState, setPlanState] = useState({ loading: true, data: null, empty: false, error: null })

  useEffect(() => trainers.watchActiveTrainers(setTrainerState), [])
  useEffect(() => memberships.watchActivePlans(setPlanState), [])

  return <main className="home-page">
    <section className="hero" id="home">
      <img
        className="hero-photo"
        src="/assets/hero-athlete.jpg"
        alt="FitZone athlete training"
        aria-hidden="true"
        fetchPriority="high"
      />
      <div className="hero-overlay" />
      <div className="container hero-container">
        <div className="hero-main">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              <span className="hero-eyebrow-line" />
              YOUR FITNESS JOURNEY STARTS HERE
            </p>
            <h1>
              STRONGER<br />
              IS A <em>FEELING.</em>
            </h1>
            <p className="hero-lead">
              A modern gym for real people, expert coaching, and a stronger, healthier you.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large hero-btn-primary" to="/plans">
                Start Your Journey <ArrowRight size={18} />
              </Link>
              <Link className="button button-outline button-large hero-btn-secondary" to="/contact">
                Explore Plans <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-script-tag">
              <span>Train</span>
              <span>Stronger</span>
              <span>Live Better</span>
            </div>
            <div className="hero-badge-right">
              <span>DISCIPLINE</span>
              <span>TODAY</span>
              <span className="badge-highlight">STRONGER</span>
              <span>TOMORROW</span>
              <div className="badge-underline" />
            </div>
          </div>
        </div>

        <div className="hero-highlights">
          <div className="hero-highlight-item">
            <div className="highlight-icon-wrap">
              <Dumbbell className="highlight-icon" size={24} strokeWidth={2.2} />
            </div>
            <span className="highlight-text">MODERN<br />EQUIPMENT</span>
          </div>
          <div className="highlight-divider" />
          <div className="hero-highlight-item">
            <div className="highlight-icon-wrap">
              <Users className="highlight-icon" size={24} strokeWidth={2.2} />
            </div>
            <span className="highlight-text">EXPERT<br />TRAINERS</span>
          </div>
          <div className="highlight-divider" />
          <div className="hero-highlight-item">
            <div className="highlight-icon-wrap">
              <HeartPulse className="highlight-icon" size={24} strokeWidth={2.2} />
            </div>
            <span className="highlight-text">A HEALTHIER<br />LIFESTYLE</span>
          </div>
          <div className="highlight-divider" />
          <div className="hero-highlight-item">
            <div className="highlight-icon-wrap">
              <Star className="highlight-icon" size={24} strokeWidth={2.2} />
            </div>
            <span className="highlight-text">SUPPORTIVE<br />COMMUNITY</span>
          </div>
        </div>
      </div>
    </section>

    <section className="intro-section section-pad" id="story"><div className="container intro-grid"><div><p className="eyebrow">MORE THAN A GYM</p><h2>Progress looks<br />good <em>on you.</em></h2></div><div><p className="intro-text">FitZone is a space to move at your pace, get expert support, and feel proud of every step. No pressure to be perfect. Just people showing up for themselves.</p><Link className="text-link" to="/about">Get to know us <ArrowUpRight size={17} /></Link></div><div className="intro-stat"><strong>MOVE</strong><span>AT YOUR PACE<br />GET STRONGER</span></div></div></section>

    <section className="section-pad program-section"><div className="container"><SectionHeading eyebrow="ROOM TO MOVE" title={<>Find your <em>thing.</em></>} text="Thoughtful training spaces and coach-led sessions for every version of you."/><div className="program-grid"><article className="program-card program-main"><span className="program-number">01 / TRAIN</span><Dumbbell size={34} /><h3>Strength<br />& conditioning</h3><p>Build a foundation, find your form, and get stronger with a plan that works for you.</p><Link to="/plans" aria-label="Explore strength memberships"><ArrowUpRight /></Link></article><article className="program-card program-orange"><span className="program-number">02 / MOVE</span><HeartPulse size={34} /><h3>Group<br />training</h3><p>Small-group energy, expert coaching, and a little extra motivation.</p><Link to="/plans" aria-label="Explore group training"><ArrowUpRight /></Link></article><article className="program-card program-light"><span className="program-number">03 / RECOVER</span><Sparkles size={34} /><h3>Mobility<br />& recovery</h3><p>Make space for better movement, flexibility, and the long game.</p><Link to="/about" aria-label="Learn about recovery"><ArrowUpRight /></Link></article></div></div></section>

    <section className="section-pad trainer-section"><div className="container"><SectionHeading eyebrow="GOOD PEOPLE. GREAT COACHES." title={<>Your team, in<br /><em>your corner.</em></>} text="Meet the coaches and explore the ways they can support your progress."/>
      {trainerState.loading ? <p className="member-data-message" role="status">Loading active trainers…</p>
        : trainerState.error ? <p className="member-data-message error" role="alert">{trainerState.error.message || 'Trainers could not be loaded.'}</p>
          : trainerState.empty ? <p className="member-data-message">There are no active trainer profiles available right now.</p>
            : <div className="trainer-grid">{trainerState.data.map((trainer) => <TrainerCard key={trainer.id} trainer={trainer} />)}</div>}
      <div className="section-end"><Link className="text-link" to="/trainers">Meet the whole team <ArrowUpRight size={17} /></Link></div></div></section>

    <section className="section-pad home-plans"><div className="container"><SectionHeading eyebrow="SIMPLE, FLEXIBLE, YOURS" title={<>Choose your <em>pace.</em></>} text="Explore current membership options and find a starting point that feels right."/>
      {planState.loading ? <p className="member-data-message" role="status">Loading membership plans…</p>
        : planState.error ? <p className="member-data-message error" role="alert">{planState.error.message || 'Membership plans could not be loaded.'}</p>
          : planState.empty ? <p className="member-data-message">There are no active membership plans available right now.</p>
            : <div className="plans-grid">{planState.data.map((plan) => <PlanCard key={plan.id} plan={plan} compact />)}</div>}
    </div></section>

    <section className="closing-cta"><div className="container closing-inner"><div><p className="eyebrow">START WHERE YOU ARE</p><h2>Come as you are.<br /><em>Leave feeling good.</em></h2></div><Link className="button button-primary button-large" to="/about">Explore FitZone <MoveUpRight size={18} /></Link></div></section>
  </main>
}
