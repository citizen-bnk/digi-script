import { useState } from 'react'
import type { DemoPersonaGroup, DemoPersonaUser } from '../api/client'
import { BubbleLogo } from './LoginScreen'

/**
 * The demo sign-in flow: pick a role, then pick which of the two seeded
 * people to be. Credentials come from the API's persona list rather than
 * being typed, so a demonstrator never has to remember an address on stage.
 */
export function DemoPickerScreen({
  groups,
  onPick,
  onUseEmail,
  busyEmail,
  error,
}: {
  groups: DemoPersonaGroup[]
  onPick: (user: DemoPersonaUser) => void
  onUseEmail: () => void
  busyEmail: string | null
  error: string | null
}) {
  const [role, setRole] = useState<string | null>(null)
  const selected = groups.find((group) => group.role === role) ?? null

  return (
    <div className="screen">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <BubbleLogo size={60} />
        <h1 style={{ fontSize: 22, margin: '12px 0 4px' }}>DigiScript</h1>
        <span className="demo-badge">Demo</span>
      </div>

      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>
        {selected ? selected.label : 'Who are you signing in as?'}
      </h2>
      <p style={{ color: 'var(--neutral-600)', fontSize: 14, margin: '0 0 20px' }}>
        {selected ? selected.blurb : 'Choose a role to see the demo accounts for it.'}
      </p>

      {error && <div className="error-banner">{error}</div>}

      {!selected ? (
        <div className="demo-list">
          {groups.map((group) => (
            <button key={group.role} type="button" className="demo-row" onClick={() => setRole(group.role)}>
              <span className="demo-row-main">
                <span className="demo-row-title">{group.label}</span>
                <span className="demo-row-sub">{group.blurb}</span>
              </span>
              <span className="demo-row-chevron">›</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="demo-list">
            {selected.users.map((user) => (
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
                <span className="demo-row-chevron">
                  {busyEmail === user.email ? '…' : '›'}
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="btn-secondary" style={{ marginTop: 16 }} onClick={() => setRole(null)}>
            ← All roles
          </button>
        </>
      )}

      <button type="button" className="demo-link" onClick={onUseEmail}>
        Sign in with an email address instead
      </button>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
