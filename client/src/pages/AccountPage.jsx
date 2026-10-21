import { Eye, EyeOff, LockKeyhole, MoveUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getAuthErrorMessage, useAuth } from '../contexts/AuthContext.jsx'
import Brand from '../components/Brand.jsx'
import {
  getDefaultLoginDestination,
  getSavedDestination,
  verifyAdminClaim,
} from '../routes/adminAuthorization.js'

export default function AccountPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const register = location.pathname === '/register'
  const { busy, initializationError, loading, login, register: registerUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('status')
  const [profileUpdateFailed, setProfileUpdateFailed] = useState(false)

  useEffect(() => {
    setShowPassword(false)
    setNotice('')
    setNoticeType('status')
    setProfileUpdateFailed(false)
  }, [location.pathname])

  function clearNotice() {
    setNotice('')
    setNoticeType('status')
    setProfileUpdateFailed(false)
  }

  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (loading || busy) return
    if (!form.reportValidity()) return

    const formData = new FormData(form)
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    if (register) {
      const name = String(formData.get('name') || '').trim()
      const confirmation = String(formData.get('confirmPassword') || '')
      if (password !== confirmation) {
        setNotice('Passwords do not match.')
        setNoticeType('error')
        setProfileUpdateFailed(false)
        form.elements.namedItem('confirmPassword').focus()
        return
      }
      if (name.length < 2) {
        form.elements.namedItem('name').setCustomValidity('Enter a name with at least 2 characters.')
        form.reportValidity()
        form.elements.namedItem('name').setCustomValidity('')
        return
      }
    }

    clearNotice()
    let verifyingLoginRedirect = false
    try {
      let authenticatedUser
      if (register) {
        const name = String(formData.get('name') || '').trim()
        authenticatedUser = await registerUser(name, email, password)
      } else {
        authenticatedUser = await login(email, password)
      }

      const destination = getSavedDestination(location.state?.from)
      if (destination) {
        navigate(destination, { replace: true })
      } else if (register) {
        navigate('/member', { replace: true })
      } else {
        verifyingLoginRedirect = true
        const isAdmin = await verifyAdminClaim(authenticatedUser)
        navigate(getDefaultLoginDestination(isAdmin), { replace: true })
      }
    } catch (error) {
      if (error?.profileCreationFailed) {
        navigate('/member/profile', { replace: true })
        return
      }
      setNotice(verifyingLoginRedirect
        ? 'You are signed in, but account access could not be verified. Please retry signing in.'
        : getAuthErrorMessage(error))
      setNoticeType('error')
      setProfileUpdateFailed(error?.code === 'auth/profile-update-failed')
    }
  }

  const disabled = loading || busy
  const feedback = notice || (loading
    ? 'Checking your sign-in status…'
    : initializationError || (busy ? (register ? 'Creating your account…' : 'Logging you in…') : ''))
  const feedbackType = noticeType === 'error' || initializationError ? 'alert' : 'status'

  return <main className="account-page"><section className="account-panel"><Brand /><p className="eyebrow">YOUR FITZONE SPACE</p><h1>{register ? <>Start with<br /><em>yourself.</em></> : <>Good to<br /><em>see you.</em></>}</h1><p className="body-copy">Your account is managed by Firebase Authentication.</p><div className="account-art"><LockKeyhole size={34} /><span>ACCOUNT ACCESS<br /><b>FIREBASE AUTHENTICATION</b></span><i /></div></section><section className="account-form-side"><div className="account-form-wrap"><p className="eyebrow">{register ? 'CREATE YOUR ACCOUNT' : 'MEMBER ACCOUNT'}</p><h2>{register ? 'Create an account' : 'Welcome back'}</h2><p className="body-copy">{register ? 'Create your FitZone member account with your email and password.' : 'Log in with the email and password for your FitZone account.'}</p><form key={register ? 'register' : 'login'} className="account-form" onSubmit={submit} aria-busy={busy || loading}>
    {register && <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your name" disabled={disabled} onChange={clearNotice} /></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" disabled={disabled} onChange={clearNotice} /></label>
    <label htmlFor="account-password">Password</label><span className="password-wrap"><input id="account-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} placeholder="At least 8 characters" disabled={disabled} onChange={clearNotice} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="account-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} disabled={disabled}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
    {register && <><label htmlFor="account-confirm-password">Confirm password</label><input id="account-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-invalid={noticeType === 'error' && notice === 'Passwords do not match.'} aria-describedby={noticeType === 'error' ? 'account-feedback' : undefined} required minLength={8} maxLength={72} placeholder="Enter your password again" disabled={disabled} onChange={clearNotice} /></>}
    {!register && <button className="forgot-link" type="button" disabled={disabled} onClick={() => { setNotice('Password reset is not available yet. Contact the gym for help with your account.'); setNoticeType('status') }}>Forgot password?</button>}
    <button className="button button-primary button-large account-submit" type="submit" disabled={disabled}>{busy ? (register ? 'Creating account…' : 'Logging in…') : (register ? 'Create account' : 'Log in')} <MoveUpRight size={17} /></button>
    <p id="account-feedback" className={`form-feedback${noticeType === 'error' ? ' error' : ''}`} role={feedbackType} aria-live={feedbackType === 'alert' ? 'assertive' : 'polite'}>{feedback}</p>
    {profileUpdateFailed && <Link className="text-link" to="/member">Continue to member area <MoveUpRight size={16} /></Link>}
  </form><p className="account-switch">{register ? 'Already have an account?' : 'New to FitZone?'} <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create an account'}</Link></p><Link className="back-home" to="/">← Back to FitZone</Link></div></section></main>
}
