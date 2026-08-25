import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BubbleLogo } from './LoginScreen'

export function ProfileScreen() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20, margin: '4px 0 16px' }}>Profile</h1>

      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {user?.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{user?.email}</div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 4,
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {user?.role}
          </span>
        </div>
      </div>

      <button
        className="btn-secondary"
        style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
        onClick={() => {
          logout()
          navigate('/login', { replace: true })
        }}
      >
        Log Out
      </button>

      <div style={{ textAlign: 'center', marginTop: 32, opacity: 0.5 }}>
        <BubbleLogo size={28} />
        <div style={{ fontSize: 12, marginTop: 6 }}>DigiScript · Parent app</div>
      </div>
    </div>
  )
}
