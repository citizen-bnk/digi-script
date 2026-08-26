import { useState } from 'react'
import type { DemoPersonaGroup, DemoPersonaUser } from '../api/client'

/**
 * Demo sign-in, shown beneath the ordinary login form: pick a role, then
 * pick which of the seeded people to be. The buttons carry only an email —
 * the server holds the demo credential — and the whole section is absent
 * when demo mode is off, leaving the plain login form.
 */
export function DemoPickerScreen({
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
