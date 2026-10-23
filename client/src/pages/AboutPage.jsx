import { ArrowDown, ArrowRight, ArrowUpRight, Dumbbell, Heart, HeartPulse, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/AboutPage.css'
import SectionHeading from '../components/SectionHeading.jsx'

const values = [
  { icon: Heart, title: 'Progress over pressure', text: 'There is no one way to get stronger. We meet you where you are.' },
  { icon: Users, title: 'People make the place', text: 'A welcoming community makes showing up feel easier.' },
  { icon: Sparkles, title: 'Coaching with care', text: 'Good form, thoughtful guidance, and encouragement every step.' },
]

const facilities = [
  { icon: Dumbbell, title: 'Strength floor', text: 'A focused space for strength work, practical coaching, and building confidence at your own pace.' },
  { icon: Users, title: 'Group studio', text: 'Small-group sessions bring expert guidance and shared energy to your weekly routine.' },
  { icon: HeartPulse, title: 'Mobility space', text: 'Room to warm up, cool down, and make recovery part of a sustainable training plan.' },
]

export default function AboutPage() {
  return (
    <main className="page-main about-page">
      <section className="page-hero">
        <img
          className="about-hero-bg"
          src="/assets/about-hero.jpg"
          alt="FitZone gym interior"
          fetchPriority="high"
        />
        <div className="about-hero-overlay" />
        <div className="container about-hero-container">
          <div className="about-hero-content">
            <p className="about-eyebrow">
              <span className="about-eyebrow-line" />
              ABOUT FITZONE / OUR STORY
            </p>
            <h1>
              MORE THAN A GYM.<br />
              A <em>STRONGER YOU.</em>
            </h1>
            <p className="about-hero-lead">
              Fitness should make your life feel bigger, not give you one more thing to get perfect.
            </p>
            <div className="about-hero-actions">
              <a href="#story" className="button button-primary about-btn-primary">
                Explore Our Story <ArrowDown size={17} />
              </a>
              <a href="#facilities" className="button button-outline about-btn-secondary">
                View Facilities <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad about-story-section" id="story">
        <div className="container about-story-grid">
          <div className="about-story-visual">
            <img
              className="about-story-photo"
              src="/assets/about-story.jpg"
              alt="FitZone coach and athlete training"
              loading="lazy"
            />
            <div className="about-story-overlay" />
            <div className="about-story-badge">
              <div>
                <span>MOVE <b>YOUR</b> WAY</span>
                <small>FITZONE / COMMUNITY</small>
              </div>
              <div className="badge-dot" />
            </div>
          </div>
          <div className="about-story-copy">
            <p className="about-eyebrow">
              <span className="about-eyebrow-line" />
              A LITTLE ABOUT US
            </p>
            <h2>Good energy.<br />Real <em>progress.</em></h2>
            <p className="body-copy">
              FitZone-Gym is built around a simple idea: a gym should help you feel more at home in your body. We bring together expert coaching, welcoming spaces, and a community that celebrates the work you put in.
            </p>
            <p className="body-copy">
              Our approach is practical and personal: start with where you are, get guidance that suits your goals, and adjust as you grow. Training and facility details on this demo site are illustrative.
            </p>
            <a className="text-link" href="#facilities">
              About our facilities <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>

      <section className="section-pad value-section about-facilities-section" id="facilities">
        <div className="container">
          <SectionHeading
            eyebrow="ROOM TO TRAIN"
            title={<>Spaces for your <em>next step.</em></>}
            text="Illustrative facility concepts; confirm actual amenities before publishing."
          />
          <div className="value-grid about-cards-grid">
            {facilities.map(({ icon: Icon, title, text }, index) => (
              <article className="value-card about-card" key={title}>
                <div className="card-top">
                  <div className="card-icon-wrap">
                    <Icon size={24} strokeWidth={2.2} />
                  </div>
                  <span className="card-number">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="card-accent-line" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad value-section about-values-section">
        <div className="container">
          <SectionHeading
            eyebrow="WHAT WE BELIEVE"
            title={<>Strong is a <em>team effort.</em></>}
          />
          <div className="value-grid about-cards-grid">
            {values.map(({ icon: Icon, title, text }, index) => (
              <article className="value-card about-card" key={title}>
                <div className="card-top">
                  <div className="card-icon-wrap">
                    <Icon size={24} strokeWidth={2.2} />
                  </div>
                  <span className="card-number">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="card-accent-line" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-cta about-closing-cta">
        <div className="container closing-inner">
          <div>
            <p className="eyebrow">READY WHEN YOU ARE</p>
            <h2>Your next step<br /><em>starts here.</em></h2>
          </div>
          <Link to="/plans" className="button button-primary button-large">
            See membership options <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  )
}

