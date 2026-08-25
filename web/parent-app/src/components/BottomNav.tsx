import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/my-child', label: 'My Child', icon: '👤' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
]

// 4-tab bottom nav matching the Parent Module screens in
// docs/design/mobile-app-screens-catalog.md (page 02).
export function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        background: 'var(--white)',
        borderTop: '1px solid var(--neutral-200)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '10px 0 8px',
            textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--neutral-600)',
            fontSize: 11,
            fontWeight: 600,
          })}
        >
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
