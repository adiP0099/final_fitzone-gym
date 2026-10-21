import { useState } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { CreditCard, Dumbbell, LayoutDashboard, Menu, UserRound, Users, X, LogOut, ClipboardCheck } from 'lucide-react'
import Brand from '../components/Brand.jsx'
import { getAuthErrorMessage, useAuth } from '../contexts/AuthContext.jsx'

const memberLinks = [
  ['Overview', '/member', LayoutDashboard, true], ['Profile', '/member/profile', UserRound], ['Membership', '/member/membership', CreditCard],
  ['Plans', '/member/plans', ClipboardCheck],
  ['Trainers', '/member/trainers', Users], ['Payments', '/member/payments', CreditCard],
]
const labels = Object.fromEntries(memberLinks.map(([label, path]) => [path, label]))

export default function DashboardLayout({ kind }) {
  const [open, setOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { busy, logout, user } = useAuth()
  const admin = kind === 'admin'
  const links = admin ? [
    ['Overview', '/admin', LayoutDashboard, true], ['Members', '/admin/members', Users], ['Membership plans', '/admin/plans', CreditCard],
    ['Membership requests', '/admin/membership-requests', ClipboardCheck],
    ['Trainers', '/admin/trainers', Dumbbell],
    ['Payments & reports', '/admin/payments', CreditCard],
  ] : memberLinks
  const title = admin ? (links.find((item) => item[1] === location.pathname)?.[0] || 'Admin workspace') : (labels[location.pathname] || 'Member portal')
  const memberName = user?.displayName?.trim() || user?.email || 'Member'
  const adminName = user?.displayName?.trim() || 'Administrator'
  const identityName = admin ? adminName : memberName
  const identityInitials = identityName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error))
    }
  }

  return <div className="dashboard-shell">
    {open && <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`dashboard-sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Brand inverse /><span className="dashboard-role">{admin ? 'ADMIN WORKSPACE' : 'MEMBER SPACE'}</span></div>
      <div className="sidebar-user"><span className="avatar">{identityInitials}</span><span><strong>{identityName}</strong><small>{admin ? 'ADMIN ACCOUNT' : 'MEMBER ACCOUNT'}</small></span></div>
      <nav className="sidebar-nav" aria-label={`${kind} navigation`}>
        <p className="sidebar-label">WORKSPACE</p>
        {links.map(([label, path, Icon, end]) => <NavLink key={path} to={path} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-bottom"><Link to="/">← <span>Public website</span></Link><button type="button" onClick={handleLogout} disabled={busy} aria-busy={busy}><LogOut size={17} /> {busy ? 'Logging out…' : 'Log out'}</button></div>
    </aside>
    <main className="dashboard-main">
      <header className="dashboard-topbar"><button className="icon-button sidebar-toggle" type="button" aria-label={open ? 'Close sidebar' : 'Open sidebar'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><div><span>FITZONE / {admin ? 'ADMIN' : 'MEMBER'}</span><h1>{title}</h1></div></header>
      <div className="dashboard-content">{logoutError && <p className="form-feedback error" role="alert">{logoutError}</p>}<Outlet /></div>
    </main>
  </div>
}
