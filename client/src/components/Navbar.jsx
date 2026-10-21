import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import Brand from './Brand.jsx'

const links = [['About', '/about'], ['Programs', '/plans'], ['Trainers', '/trainers'], ['Contact', '/contact']]
const LOGO_GESTURE_CLICKS = 5
const LOGO_GESTURE_WINDOW_MS = 3000

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { loading: authLoading, user } = useAuth()
  const navigate = useNavigate()
  const logoClickCount = useRef(0)
  const logoClickTimer = useRef(null)

  useEffect(() => () => {
    if (logoClickTimer.current !== null) window.clearTimeout(logoClickTimer.current)
  }, [])

  function resetLogoGesture() {
    logoClickCount.current = 0
    if (logoClickTimer.current !== null) {
      window.clearTimeout(logoClickTimer.current)
      logoClickTimer.current = null
    }
  }

  function handleLogoClick(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.detail === 0) return

    if (logoClickCount.current === 0) {
      logoClickTimer.current = window.setTimeout(() => {
        logoClickCount.current = 0
        logoClickTimer.current = null
      }, LOGO_GESTURE_WINDOW_MS)
    }

    logoClickCount.current += 1
    if (logoClickCount.current < LOGO_GESTURE_CLICKS) return

    event.preventDefault()
    resetLogoGesture()
    navigate(authLoading || user ? '/admin' : '/login')
  }

  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Brand inverse onClick={handleLogoClick} />
        <button className="icon-button mobile-menu" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav className={`main-nav${open ? ' main-nav-open' : ''}`} aria-label="Main navigation">
          {links.map(([label, to]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}
          <div className="nav-actions"><Link className="button button-quiet" to="/login" onClick={() => setOpen(false)}>Log in</Link><Link className="button button-primary" to="/register" onClick={() => setOpen(false)}>Join now <span>↗</span></Link></div>
        </nav>
      </div>
    </header>
  )
}
