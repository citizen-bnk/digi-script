import { useState } from 'react'
import { api, ApiError, type DemoPersonaGroup, type DemoPersonaUser } from '../api/client'

/**
 * Demo sign-in, shown beneath the ordinary login form: pick a role, then
 * pick which of the seeded people to be. The buttons carry only an email —
 * the server holds the demo credential — and the whole section is absent
 * when demo mode is off, leaving the plain login form.
 */
export function DemoPickerScreen({
  groups,
  onPick,
  onSeeded,
  busyEmail,
}: {
  groups: DemoPersonaGroup[]
  onPick: (user: DemoPersonaUser) => void
  onSeeded: () => void
  busyEmail: string | null
}) {
  const [role, setRole] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const selected = groups.find((group) => group.role === role) ?? null

  async function loadDemoData() {
    setSeeding(true)
    setSeedError(null)
    try {
      await api.seedDemo()
      onSeeded()
    } catch (err) {
      setSeedError(err instanceof ApiError ? err.message : 'Could not load the demo data')
    } finally {
      setSeeding(false)
    }
  }

  // Demo mode is on but no school has any demo accounts — on a fresh
  // deployment that means the data was never loaded. Say so and offer to fix
  // it, rather than rendering nothing and leaving a demonstrator guessing.
  if (groups.length === 0) {
    return (
      <section className="demo-section">
        <div className="demo-section-head">
          <span className="demo-rule" />
          <span className="demo-badge">Demo</span>
          <span className="demo-rule" />
        </div>
        <p className="demo-section-hint">
          Demo mode is on, but this deployment has no demo data yet.
        </p>
        {seedError && <div className="error-banner">{seedError}</div>}
        <button type="button" className="btn-secondary" disabled={seeding} onClick={loadDemoData}>
          {seeding ? 'Loading demo data…' : 'Load demo data'}
        </button>
      </section>
    )
  }

  return (
    <section className="demo-section">
      <div className="demo-section-head">
        <span className="demo-rule" />
        <span className="demo-badge">Demo</span>
        <span className="demo-rule" />
      </div>

      <p className="demo-section-hint">
        {selected ? selected.blurb : 'Or sign in as one of the demo accounts:'}
      </p>

      <div className="demo-list">
        {!selected
          ? groups.map((group) => (
              <button key={group.role} type="button" className="demo-row" onClick={() => setRole(group.role)}>
                <span className="demo-row-main">
                  <span className="demo-row-title">{group.label}</span>
                  <span className="demo-row-sub">{group.blurb}</span>
                </span>
                <span className="demo-row-chevron">›</span>
              </button>
            ))
          : selected.users.map((user) => (
              <button
                key={user.email}
                type="button"
                className="demo-row"
                disabled={busyEmail !== null}
                onClick={() => onPick(user)}
              >
                <span className="demo-avatar">{initials(user.name)}</span>
                <span className="demo-row-main">
                  <span className="demo-row-title">{user.name}</span>
                  <span className="demo-row-sub">{user.subtitle}</span>
                </span>
                <span className="demo-row-chevron">{busyEmail === user.email ? '…' : '›'}</span>
              </button>
            ))}
      </div>

      {selected && (
        <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={() => setRole(null)}>
          ← All roles
        </button>
      )}
    </section>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
