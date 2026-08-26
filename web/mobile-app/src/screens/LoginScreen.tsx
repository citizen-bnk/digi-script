import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'
import { DemoPickerScreen } from './DemoPickerScreen'

export function LoginScreen() {
  const { login, loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Demo mode is discovered rather than configured in this app: the API
  // answers /demo/personas only when DEMO_MODE is on, and 404s otherwise.
  // That keeps the two from disagreeing about whether a demo is running.
  const [demoGroups, setDemoGroups] = useState<DemoPersonaGroup[]>([])
  const [busyEmail, setBusyEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .demoPersonas('mobile')
      .then((res) => !cancelled && setDemoGroups(res.groups))
      .catch(() => !cancelled && setDemoGroups([]))
    return () => {
      cancelled = true
    }
  }, [])

  async function signInAs(user: DemoPersonaUser) {
    setError(null)
    setBusyEmail(user.email)
    try {
      await loginAsDemo(user.email)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not sign in as ${user.name}.`)
    } finally {
      setBusyEmail(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <BubbleLogo size={72} />
        <h1 style={{ fontSize: 24, margin: '16px 0 4px' }}>DigiScript</h1>
        <p style={{ color: 'var(--neutral-600)', fontSize: 14, margin: 0 }}>Your documents. Smarter answers.</p>
      </div>

      <h2 style={{ fontSize: 20, margin: '0 0 4px' }}>Welcome back</h2>
      <p style={{ color: 'var(--neutral-600)', fontSize: 14, margin: '0 0 24px' }}>
        Sign in to your DigiScript account
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.example"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {demoGroups.length > 0 && (
        <DemoPickerScreen groups={demoGroups} onPick={signInAs} busyEmail={busyEmail} />
      )}
    </div>
  )
}

export function BubbleLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="DigiScript">
      <rect width="100" height="100" rx="22" fill="#0066CC" />
      <rect x="20" y="18" width="60" height="52" rx="14" fill="#fff" />
      <polygon points="30,68 30,82 44,68" fill="#fff" />
      <rect x="30" y="32" width="36" height="7" rx="3.5" fill="#0066CC" />
      <rect x="30" y="44" width="42" height="7" rx="3.5" fill="#0066CC" />
      <rect x="30" y="56" width="26" height="7" rx="3.5" fill="#0066CC" />
    </svg>
  )
}
