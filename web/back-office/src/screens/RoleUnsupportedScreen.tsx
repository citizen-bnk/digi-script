import { useAuth } from '../context/AuthContext'

/**
 * Teachers, supervisors, parents and students belong to System A, the mobile
 * PWA. Rather than showing them an empty portal, say so plainly — their
 * credentials are valid, just not for this app.
 */
export default function RoleUnsupportedScreen() {
  const { user, logout } = useAuth()

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="mark">◈</div>
        <h1>Wrong app for this account</h1>
        <p className="sub">
          You’re signed in as <strong>{user?.name}</strong> ({user?.role.replace(/_/g, ' ').toLowerCase()}).
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
          The back office covers System Owner, Super User and Support accounts. Teachers, supervisors, parents and
          students use the DigiScript mobile app instead — everything for your role lives there.
        </p>
        <button type="button" className="primary" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  )
}
