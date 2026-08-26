import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'
import DemoPicker from './DemoPicker'
import { BrandCap, CapIcon, ChevronIcon, EyeIcon, LockIcon, PersonIcon } from '../components/icons'

export default function LoginScreen() {
  const { login, loginAsDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Demo mode is discovered rather than configured in this app: the API
  // answers /demo/personas only when DEMO_MODE is on, and lists only schools
  // a SYSTEM_OWNER has switched on.
  const [demo, setDemo] = useState<{
    demoMode: boolean
    seeded: boolean
    groups: DemoPersonaGroup[]
  } | null>(null)
  const [demoNonce, setDemoNonce] = useState(0)
  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  // Why the demo section is absent, when the reason is a fault rather than
  // demo mode simply being switched off.
  const [demoFailure, setDemoFailure] = useState<string | null>(null)
  // Local only: collapses the demo section for a plain sign-in. It cannot
  // switch demo mode ON — that is a per-school setting a system owner
  // controls, and the server is the authority on it.
  const [demoExpanded, setDemoExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .demoPersonas('back-office')
      .then((res) => {
        if (cancelled) return
        setDemo(res)
        setDemoFailure(null)
      })
      .catch((err) => {
        if (cancelled) return
        setDemo(null)
        // A 404 is the API saying demo mode is deliberately off, which is
        // not a fault and needs no explanation. Anything else — the API
        // unconfigured, the database unreachable, the network down — used to
        // render identically to that, so a broken deployment looked like a
        // deliberate setting. Say which it is.
        setDemoFailure(
          err instanceof ApiError && err.status === 404
            ? null
            : err instanceof ApiError
              ? err.message
              : 'Could not reach the DigiScript API.',
        )
      })
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
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-brand">
          <BrandCap />
          <h1>DigiScript</h1>
        </div>
        <p>
          Back Office <span aria-hidden="true">|</span> Smarter Administration
        </p>
      </header>

      <main className="auth-body">
        <section className="welcome-card">
          <h2>Welcome Back</h2>
          <p>Sign in to your DigiScript Back Office</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={onSubmit} className="auth-form">
            <div className="input-shell">
              <span className="input-icon">
                <PersonIcon />
              </span>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username / Email"
                aria-label="Username or email"
              />
            </div>

            <div className="input-shell">
              <span className="input-icon">
                <LockIcon />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
              />
              <button
                type="button"
                className="input-affix"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>

            <button type="submit" className="btn-login" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Login'}
              {!submitting && <ChevronIcon />}
            </button>
          </form>
        </section>

        {demoFailure && (
          <div className="info-note is-fault">
            <span className="info-note-icon" aria-hidden="true">
              !
            </span>
            <div>
              <p style={{ margin: 0 }}>
                <strong>Demo accounts unavailable.</strong> {demoFailure}
              </p>
              <button
                type="button"
                className="btn-ghost"
                style={{ marginTop: 10 }}
                onClick={() => setDemoNonce((n) => n + 1)}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {demo?.demoMode && (
          <>
            <div className="demo-banner">
              <span className="demo-banner-icon">
                <CapIcon />
              </span>
              <span className="demo-banner-text">
                <strong>Demo Mode</strong>
                <small>Run a live demo using sample accounts</small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={demoExpanded}
                aria-label="Show demo accounts"
                className="switch"
                onClick={() => setDemoExpanded((v) => !v)}
              />
            </div>

            {demoExpanded && (
              <DemoPicker
                groups={demo.groups}
                seeded={demo.seeded}
                onPick={signInAs}
                onSeeded={() => setDemoNonce((n) => n + 1)}
                busyEmail={busyEmail}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
