import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'
import DemoPicker from './DemoPicker'

export default function LoginScreen() {
  const { login, loginAsDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Demo mode is discovered rather than configured in this app: the API
  // answers /demo/personas only when DEMO_MODE is on, and lists only schools
  // a SYSTEM_OWNER has switched on. An empty or failed answer means the demo
  // section simply isn't rendered, leaving an ordinary login form.
  // null means demo mode is off (the API 404s), which is different from
  // demo mode being on with nothing seeded — that shows a "load demo data"
  // prompt rather than silently rendering nothing.
  const [demo, setDemo] = useState<{ demoMode: boolean; groups: DemoPersonaGroup[] } | null>(null)
  const [demoNonce, setDemoNonce] = useState(0)
  const [busyEmail, setBusyEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .demoPersonas('back-office')
      .then((res) => !cancelled && setDemo(res))
      .catch(() => !cancelled && setDemo(null))
    return () => {
      cancelled = true
    }
  }, [demoNonce])

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
      await loginAsDemo(user.email)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not sign in as ${user.name}.`)
    } finally {
      setBusyEmail(null)
    }
  }

  return (
    <div className="login-page">
      <div className={`login-card${demo?.demoMode ? ' with-demo' : ''}`}>
        <form onSubmit={onSubmit}>
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
        </form>

        {demo?.demoMode && (
          <DemoPicker
            groups={demo.groups}
            onPick={signInAs}
            onSeeded={() => setDemoNonce((n) => n + 1)}
            busyEmail={busyEmail}
          />
        )}
      </div>
    </div>
  )
}
