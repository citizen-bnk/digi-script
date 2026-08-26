import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'
import { DemoPickerScreen } from './DemoPickerScreen'
import { BrandCap, CapIcon, ChevronIcon, EyeIcon, LockIcon, SchoolIcon, UserIcon } from '../components/icons'

type DemoSchool = { key: string; name: string; seeded: boolean; demoModeEnabled: boolean }

export function LoginScreen() {
  const { login, loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetHint, setResetHint] = useState(false)

  // Demo mode is discovered rather than configured in this app: the API
  // answers /demo/personas only when DEMO_MODE is on, and 404s otherwise.
  // That keeps the two from disagreeing about whether a demo is running.
  const [demo, setDemo] = useState<{
    demoMode: boolean
    seeded: boolean
    schools: DemoSchool[]
    groups: DemoPersonaGroup[]
  } | null>(null)
  const [demoNonce, setDemoNonce] = useState(0)
  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  // Why the demo section is absent, when the reason is a fault rather than
  // demo mode simply being switched off.
  const [demoFailure, setDemoFailure] = useState<string | null>(null)
  const [schoolKey, setSchoolKey] = useState<string | null>(null)
  // Local only: collapses the demo section when a demonstrator wants the
  // plain login form. It cannot switch demo mode ON — that is a per-school
  // setting a system owner controls, and the server is the authority.
  const [demoExpanded, setDemoExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .demoPersonas('mobile')
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

  const seededSchools = useMemo(
    () => demo?.schools.filter((school) => school.seeded) ?? [],
    [demo],
  )

  // Default to the first school that actually has the demo switched on, so
  // the screen opens on something that works rather than on a dead end.
  useEffect(() => {
    if (schoolKey !== null || seededSchools.length === 0) return
    setSchoolKey((seededSchools.find((s) => s.demoModeEnabled) ?? seededSchools[0]).key)
  }, [seededSchools, schoolKey])

  const school = seededSchools.find((s) => s.key === schoolKey) ?? null
  const schoolAllowsDemo = school ? school.demoModeEnabled : seededSchools.length === 0

  // District staff belong to no school, so they stay available whichever
  // school is selected — otherwise switching every school off would hide the
  // very accounts needed to switch one back on.
  const groups = useMemo(() => {
    if (!demo) return []
    if (!school) return demo.groups
    return demo.groups
      .map((group) => ({
        ...group,
        users: group.users.filter((u) => u.schoolKey === null || u.schoolKey === school.key),
      }))
      .filter((group) => group.users.length > 0)
  }, [demo, school])

  function cycleSchool() {
    if (seededSchools.length < 2) return
    const index = seededSchools.findIndex((s) => s.key === schoolKey)
    setSchoolKey(seededSchools[(index + 1) % seededSchools.length].key)
  }

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

  const showDemoSection = demo?.demoMode === true

  return (
    <div className="auth-page">
      <header className="auth-header">
        <span className="auth-brand-cap">
          <BrandCap />
        </span>
        <h1>DigiScript</h1>
        <p>Smarter Schools. Stronger Futures.</p>
      </header>

      <main className="auth-body">
        {school && (
          <button
            type="button"
            className="school-card"
            onClick={cycleSchool}
            disabled={seededSchools.length < 2}
            aria-label={
              seededSchools.length < 2 ? school.name : `${school.name}. Tap to change school.`
            }
          >
            <span className="school-card-icon">
              <SchoolIcon />
            </span>
            <span className="school-card-text">
              <strong>{school.name}</strong>
              <small>
                {seededSchools.length < 2 ? 'Demo district' : 'Tap to switch school'}
              </small>
            </span>
            {seededSchools.length > 1 && <ChevronIcon />}
          </button>
        )}

        {showDemoSection && (
          <div className={`demo-banner${schoolAllowsDemo ? '' : ' is-off'}`}>
            <span className="demo-banner-icon">
              <CapIcon size={20} />
            </span>
            <span className="demo-banner-text">
              <strong>Demo Mode</strong>
              <small>
                {schoolAllowsDemo
                  ? `Run a demo using sample accounts${school ? ` for ${school.name}` : ''}`
                  : 'Available for this school'}
              </small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={schoolAllowsDemo && demoExpanded}
              aria-label="Show demo accounts"
              className="switch"
              // Off at the school level is not something a visitor can undo:
              // the control reports that state rather than pretending to set it.
              disabled={!schoolAllowsDemo}
              onClick={() => setDemoExpanded((v) => !v)}
            />
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

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

        {showDemoSection && (!schoolAllowsDemo || demoExpanded) && (
          <DemoPickerScreen
            groups={groups}
            seeded={demo.seeded}
            schoolAllowsDemo={schoolAllowsDemo}
            onPick={signInAs}
            onSeeded={() => setDemoNonce((n) => n + 1)}
            busyEmail={busyEmail}
          />
        )}

        {showDemoSection && schoolAllowsDemo && demoExpanded && (
          <div className="or-divider">
            <span>OR</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-shell">
            <span className="input-icon">
              <UserIcon />
            </span>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
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

        <button type="button" className="link-forgot" onClick={() => setResetHint(true)}>
          Forgot Password?
        </button>
        {resetHint && (
          // There is no self-service reset: passwords are issued by the school
          // and reset from the back office. Saying so beats a link that goes
          // nowhere.
          <p className="forgot-hint">
            Ask your school administrator to reset your password from the back office.
          </p>
        )}
      </main>
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
