import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BubbleLogo } from './LoginScreen'

// SYSTEM_OWNER, SUPER_USER, and SUPPORT are System B (the web back-office)
// per the Product decisions in the root README — this mobile app doesn't
// have anything for them, and pretending otherwise would be worse than
// saying so plainly.
export function RoleUnsupportedScreen() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <BubbleLogo size={56} />
      <h1 style={{ fontSize: 18, margin: '16px 0 8px' }}>This app doesn't cover your role yet</h1>
      <p style={{ color: 'var(--neutral-600)', fontSize: 14, maxWidth: 320 }}>
        You're signed in as <strong>{user?.role}</strong>. This mobile app currently supports Parent, Teacher,
        Supervisor, and Student accounts. Your role uses the web back-office portal, which is a separate,
        not-yet-built part of DigiScript.
      </p>
      <button
        className="btn-secondary"
        style={{ marginTop: 20, maxWidth: 200 }}
        onClick={() => {
          logout()
          navigate('/login', { replace: true })
        }}
      >
        Log Out
      </button>
    </div>
  )
}
