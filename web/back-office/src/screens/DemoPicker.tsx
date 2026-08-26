import { useState } from 'react'
import type { DemoPersonaGroup, DemoPersonaUser } from '../api/client'

/**
 * The demo sign-in flow: pick a role, then pick which of the two seeded
 * people to be. Credentials come from the API's persona list rather than
 * being typed, so a demonstrator never has to remember an address on stage.
 */
export default function DemoPicker({
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
    <div className="demo-page">
      <div className="demo-card">
        <div className="demo-head">
          <div className="mark">◈</div>
          <div>
            <h1>DigiScript Back Office</h1>
            <p className="sub">{selected ? selected.blurb : 'Choose a role to sign in as'}</p>
          </div>
          <span className="pill pill-warn demo-flag">Demo</span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {!selected ? (
          <div className="demo-grid">
            {groups.map((group) => (
              <button key={group.role} type="button" className="demo-tile" onClick={() => setRole(group.role)}>
                <span className="demo-tile-label">{group.label}</span>
                <span className="demo-tile-blurb">{group.blurb}</span>
                <span className="demo-tile-count">
                  {group.users.length} demo {group.users.length === 1 ? 'account' : 'accounts'} →
                </span>
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

        <button type="button" className="demo-link" onClick={onUseEmail}>
          Sign in with an email address instead
        </button>
      </div>
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
