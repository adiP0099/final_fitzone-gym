import { Link } from 'react-router-dom'
import Brand from './Brand.jsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><Brand inverse /><p className="footer-copy">A place to show up, find your pace, and build a stronger everyday.</p></div>
        <div><h3>Explore</h3><Link to="/about">Our story</Link><Link to="/plans">Membership</Link><Link to="/trainers">Coaching team</Link><Link to="/contact">Get in touch</Link></div>
        <div><h3>Come say hello</h3><p>Contact details will be updated soon.</p></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 FitZone Gym</span><span>Find your pace. Keep moving.</span></div>
    </footer>
  )
}
