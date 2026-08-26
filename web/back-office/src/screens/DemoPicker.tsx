import { useState } from 'react'
import type { DemoPersonaGroup, DemoPersonaUser } from '../api/client'

/**
 * Demo sign-in, shown beneath the ordinary login form: pick a role, then
 * pick which of the seeded people to be. The buttons carry only an email —
 * the server holds the demo credential — and the whole section is absent
 * when demo mode is off, leaving the plain login form.
 */
export default function DemoPicker({
  groups,
  onPick,
  busyEmail,
}: {
  groups: DemoPersonaGroup[]
  onPick: (user: DemoPersonaUser) => void
  busyEmail: string | null
}) {
  const [role, setRole] = useState<string | null>(null)
  const selected = groups.find((group) => group.role === role) ?? null

  return (
    <section className="demo-section">
      <div className="demo-section-head">
        <span className="demo-rule" />
        <span className="pill pill-warn">Demo</span>
        <span className="demo-rule" />
      </div>

      <p className="demo-section-hint">
        {selected ? selected.blurb : 'Or sign in as one of the demo accounts:'}
      </p>

      {!selected ? (
        <div className="demo-grid">
          {groups.map((group) => (
            <button key={group.role} type="button" className="demo-tile" onClick={() => setRole(group.role)}>
              <span className="demo-tile-label">{group.label}</span>
              <span className="demo-tile-blurb">{group.blurb}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="demo-grid">
            {selected.users.map((user) => (
              <button
                key={user.email}
                type="button"
                className="demo-tile person"
                disabled={busyEmail !== null}
                onClick={() => onPick(user)}
              >
                <span className="demo-avatar">{initials(user.name)}</span>
                <span className="demo-tile-label">{user.name}</span>
                <span className="demo-tile-blurb">{user.subtitle}</span>
                <span className="demo-tile-count">
                  {busyEmail === user.email ? 'Signing in…' : 'Sign in →'}
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="secondary demo-back" onClick={() => setRole(null)}>
            ← All roles
          </button>
        </>
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
