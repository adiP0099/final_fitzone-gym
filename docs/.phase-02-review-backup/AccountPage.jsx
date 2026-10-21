import { Eye, EyeOff, LockKeyhole, MoveUpRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Brand from '../components/Brand.jsx'

export default function AccountPage() {
  const location = useLocation()
  const register = location.pathname === '/register'
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (register && event.currentTarget.password.value !== event.currentTarget.confirmPassword.value) {
      setNotice('Passwords do not match.')
      event.currentTarget.confirmPassword.focus()
      return
    }
    setNotice('Demo only: no account was created and nobody was signed in.')
  }
  return <main className="account-page"><section className="account-panel"><Brand /><p className="eyebrow">YOUR FITZONE SPACE</p><h1>{register ? <>Start with<br /><em>yourself.</em></> : <>Good to<br /><em>see you.</em></>}</h1><p className="body-copy">The account form is a visual demo. Authentication is not enabled in this phase.</p><div className="account-art"><LockKeyhole size={34} /><span>ACCOUNT ACCESS<br /><b>DEVELOPMENT PREVIEW</b></span><i /></div></section><section className="account-form-side"><div className="account-form-wrap"><p className="eyebrow">{register ? 'CREATE A DEMO PROFILE' : 'MEMBER ACCOUNT'}</p><h2>{register ? 'Create an account' : 'Welcome back'}</h2><p className="body-copy">No real sign-in or account creation will occur.  </p><form className="account-form" onSubmit={submit}>
    {register && <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your name" /></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
    <label>Password<span className="password-wrap"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} placeholder="At least 8 characters" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
    {register && <label>Confirm password<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} placeholder="Enter your password again" /></label>}
    {!register && <button className="forgot-link" type="button" onClick={() => setNotice('Password reset is not available in this frontend-only demo.')}>Forgot password?</button>}
    <button className="button button-primary button-large account-submit" type="submit">{register ? 'Preview registration' : 'Preview login'} <MoveUpRight size={17} /></button>
    <p className="form-feedback" role="status" aria-live="polite">{notice}</p>
  </form><p className="account-switch">{register ? 'Already have an account?' : 'New to FitZone?'} <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create an account'}</Link></p><Link className="back-home" to="/">← Back to FitZone</Link></div></section></main>
}
