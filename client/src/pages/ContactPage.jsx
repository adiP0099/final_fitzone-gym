import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react'
import '../styles/ContactPage.css'

const CONTACT_INFO = [
  {
    icon: MapPin,
    title: 'HQ & Training Facility',
    lines: ['100 Fitness Boulevard', 'Downtown District, NY 10001'],
    linkText: 'Get Directions',
    href: 'https://maps.google.com/?q=FitZone+Gym',
    isExternal: true,
  },
  {
    icon: Clock,
    title: 'Staffed Hours',
    lines: [
      'Mon – Fri: 5:00 AM – 11:00 PM',
      'Sat – Sun: 7:00 AM – 9:00 PM',
      '24/7 keycard access for active members',
    ],
  },
  {
    icon: Phone,
    title: 'Direct Phone Line',
    lines: ['+1 (800) 555-FITZ (3489)'],
    linkText: 'Call our front desk',
    href: 'tel:+18005553489',
  },
  {
    icon: Mail,
    title: 'Email Support',
    lines: ['hello@fitzonegym.com', 'support@fitzonegym.com'],
    linkText: 'Send an email',
    href: 'mailto:hello@fitzonegym.com',
  },
]

const PERKS = [
  'Complimentary 1-day pass for first-time visitors',
  'Certified coaches & personal trainers on-site daily',
  'Full locker rooms, private showers & recovery saunas',
  'Free visitor parking available on-site',
]

const FAQS = [
  {
    question: 'Can I try the gym before signing up for a plan?',
    answer:
      'Yes! We offer a complimentary day pass for local first-time visitors. Simply drop by during staffed hours with a valid photo ID or submit the form above to reserve your visit.',
  },
  {
    question: 'What are your staffed front desk hours?',
    answer:
      'Our front desk and coaching teams are on-site Monday through Friday from 5:00 AM to 11:00 PM, and Saturday/Sunday from 7:00 AM to 9:00 PM. Active members enjoy round-the-clock 24/7 keycard access.',
  },
  {
    question: 'How quickly will your team respond to my message?',
    answer:
      'Our member support and coaching teams review all enquiries promptly and typically respond within 24 hours during standard business days.',
  },
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate reliable form submission feedback
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  const handleReset = () => {
    setSubmitted(false)
    setFormData({
      name: '',
      email: '',
      subject: 'General Inquiry',
      message: '',
    })
  }

  return (
    <main className="page-main contact-page">
      {/* Hero Section */}
      <section className="page-hero">
        <img
          src="/assets/contact-hero.jpg"
          alt="FitZone front desk and training facility"
          className="contact-hero-bg"
          loading="eager"
        />
        <div className="contact-hero-overlay" />
        <div className="container contact-hero-container">
          <div className="contact-hero-content">
            <p className="contact-eyebrow">
              <span className="contact-eyebrow-line" />
              GET IN TOUCH
            </p>
            <h1>
              LET’S BUILD A<br />
              <em>STRONGER YOU.</em>
            </h1>
            <p className="contact-hero-lead">
              Questions about memberships, first-time visits, or coaching? Drop
              us a line or come visit our floor. We’re here to help you find
              your pace.
            </p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Contact Section */}
      <section className="contact-main-section">
        <div className="container">
          <div className="contact-layout">
            {/* Left: Contact Info & Perks */}
            <div className="contact-details">
              <p className="eyebrow">VISIT & CONNECT</p>
              <h2>
                WE’D LOVE TO<br />
                <em>HEAR FROM YOU.</em>
              </h2>
              <p className="contact-details-intro">
                Whether you’re ready to start training today, want to tour our
                facility, or have a question about our membership options, our
                team is standing by.
              </p>

              <div className="contact-cards-list">
                {CONTACT_INFO.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div key={idx} className="contact-info-card">
                      <div className="contact-icon-box">
                        <Icon size={20} strokeWidth={2.2} />
                      </div>
                      <div className="contact-card-copy">
                        <strong>{item.title}</strong>
                        {item.lines.map((line, lIdx) => (
                          <small key={lIdx}>{line}</small>
                        ))}
                        {item.href && item.linkText && (
                          <small style={{ marginTop: '6px' }}>
                            <a
                              href={item.href}
                              target={item.isExternal ? '_blank' : undefined}
                              rel={item.isExternal ? 'noopener noreferrer' : undefined}
                              className="contact-link"
                            >
                              {item.linkText} →
                            </a>
                          </small>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="contact-perks-list">
                {PERKS.map((perk, idx) => (
                  <span key={idx}>
                    <ShieldCheck size={16} />
                    {perk}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Modern Contact Form */}
            <div className="form-card">
              <h2>SEND A MESSAGE</h2>
              <p className="body-copy">
                Fill out the form below and our team will get back to you within
                24 hours.
              </p>

              {submitted ? (
                <div className="submitted-container">
                  <div className="form-feedback success">
                    <CheckCircle2 size={24} />
                    <div>
                      <strong>Message Received!</strong>
                      <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                        Thank you for reaching out, {formData.name || 'friend'}.
                        Our staff will review your message and reply via{' '}
                        {formData.email} shortly.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="contact-submit-btn"
                    style={{
                      marginTop: '24px',
                      background: 'transparent',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      boxShadow: 'none',
                    }}
                  >
                    <RotateCcw size={16} /> Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="form-group">
                    <label htmlFor="contact-name">Full Name *</label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contact-email">Email Address *</label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contact-subject">Topic / Reason *</label>
                    <select
                      id="contact-subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Membership Plans & Pricing">
                        Membership Plans & Pricing
                      </option>
                      <option value="Personal Coaching">Personal Coaching</option>
                      <option value="Claim a Free Day Pass">
                        Claim a Free Day Pass
                      </option>
                      <option value="Facility Tour & Amenities">
                        Facility Tour & Amenities
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="contact-message">Your Message *</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      required
                      placeholder="How can we help you reach your goals?"
                      value={formData.message}
                      onChange={handleChange}
                    />
                  </div>

                  <button
                    type="submit"
                    className="contact-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      'Sending Message...'
                    ) : (
                      <>
                        SEND MESSAGE <Send size={16} />
                      </>
                    )}
                  </button>

                  <p
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'rgba(245, 242, 235, 0.55)',
                      margin: '6px 0 0',
                    }}
                  >
                    <ShieldCheck size={14} color="#ff5a1f" />
                    We respect your privacy. No spam or unsolicited promotions.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Visitor FAQ Section */}
      <section className="contact-faq-section">
        <div className="container">
          <div className="section-head text-center" style={{ marginBottom: '45px' }}>
            <p className="eyebrow">COMMON QUESTIONS</p>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 46px)' }}>
              BEFORE YOU <em>STOP BY.</em>
            </h2>
            <p className="lead" style={{ margin: '12px auto 0', maxWidth: '580px' }}>
              Quick answers to the questions we hear most often from first-time
              visitors and future members.
            </p>
          </div>

          <div className="faq-grid">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="faq-card">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="contact-closing-cta">
        <div className="container closing-inner">
          <div>
            <p className="eyebrow">READY TO COMMIT?</p>
            <h2>
              TRANSFORM YOUR BODY.<br />
              <em>ELEVATE YOUR LIFE.</em>
            </h2>
          </div>
          <Link to="/register" className="button button-primary button-large">
            JOIN FITZONE TODAY <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  )
}
