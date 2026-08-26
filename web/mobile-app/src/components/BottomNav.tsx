import { NavLink } from 'react-router-dom'

export interface NavTab {
  to: string
  label: string
  icon: string
  end?: boolean
}

// Generic 4-tab bottom nav — which tabs it shows depends on role (see
// role-specific tab sets in App.tsx), matching the pattern in
// docs/design/mobile-app-screens-catalog.md where each role gets the same
// nav shell with different destinations.
export function BottomNav({ tabs }: { tabs: NavTab[] }) {
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
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
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
