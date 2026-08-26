import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'
import DemoPicker from './DemoPicker'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Demo mode is discovered rather than configured in this app: the API
  // answers /demo/personas only when DEMO_MODE is on, and 404s otherwise.
  // That keeps the two from disagreeing about whether a demo is running.
  const [demoGroups, setDemoGroups] = useState<DemoPersonaGroup[] | null>(null)
  const [checkingDemo, setCheckingDemo] = useState(true)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [busyEmail, setBusyEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .demoPersonas('back-office')
      .then((res) => !cancelled && setDemoGroups(res.groups))
      .catch(() => !cancelled && setDemoGroups(null))
      .finally(() => !cancelled && setCheckingDemo(false))
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function signInAs(user: DemoPersonaUser) {
    setError(null)
    setBusyEmail(user.email)
    try {
      await login(user.email, user.password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not sign in as ${user.name}.`)
    } finally {
      setBusyEmail(null)
    }
  }

  if (checkingDemo) {
    return <div className="demo-page" />
  }

  if (demoGroups && demoGroups.length > 0 && !showEmailForm) {
    return (
      <DemoPicker
        groups={demoGroups}
        onPick={signInAs}
        onUseEmail={() => setShowEmailForm(true)}
        busyEmail={busyEmail}
        error={error}
      />
    )
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="mark">◈</div>
        <h1>DigiScript Back Office</h1>
        <p className="sub">Sign in to the administration portal.</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        {demoGroups && demoGroups.length > 0 && (
          <button type="button" className="demo-link" onClick={() => setShowEmailForm(false)}>
            ← Back to the demo role picker
          </button>
        )}
      </form>
    </div>
  )
}
