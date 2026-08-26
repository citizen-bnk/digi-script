import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSchool } from '../context/SchoolContext'

export interface NavItem {
  to: string
  label: string
  icon: string
}

/**
 * Nav differs by role rather than being one menu with hidden items, so the
 * sidebar never offers a destination the API would refuse. SUPPORT is the
 * narrow case: the help desk reads escalations and audit logs but has no
 * user management or student records (see ROLE_GROUPS.backOffice).
 */
const NAV_BY_ROLE: Record<string, NavItem[]> = {
  SYSTEM_OWNER: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/schools', label: 'Multi-School', icon: '🏫' },
    { to: '/documents', label: 'Documents', icon: '📄' },
    { to: '/escalations', label: 'Escalations', icon: '⚠️' },
    { to: '/users', label: 'Users', icon: '👥' },
    { to: '/students', label: 'Students', icon: '🎓' },
    { to: '/audit', label: 'Audit Logs', icon: '📋' },
  ],
  SUPER_USER: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/documents', label: 'Documents', icon: '📄' },
    { to: '/escalations', label: 'Escalations', icon: '⚠️' },
    { to: '/users', label: 'Users', icon: '👥' },
    { to: '/students', label: 'Students', icon: '🎓' },
    { to: '/audit', label: 'Audit Logs', icon: '📋' },
  ],
  SUPPORT: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/escalations', label: 'Escalations', icon: '⚠️' },
    { to: '/audit', label: 'Audit Logs', icon: '📋' },
  ],
}

export function navForRole(role: string): NavItem[] {
  return NAV_BY_ROLE[role] ?? []
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const { schools, activeSchool, setActiveSchoolId } = useSchool()
  const items = navForRole(user?.role ?? '')
  const isOwner = user?.role === 'SYSTEM_OWNER'

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-mark">◈</span>
          DigiScript
        </div>

        <div className="sidebar-scope">
          {isOwner && schools.length > 1 ? (
            <>
              <strong>Viewing school</strong>
              <select
                aria-label="Active school"
                value={activeSchool?.id ?? ''}
                onChange={(e) => setActiveSchoolId(e.target.value)}
                style={{ marginTop: 8, fontSize: 13, padding: '6px 8px' }}
              >
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <strong>{activeSchool?.name ?? 'No school assigned'}</strong>
              {activeSchool?.district?.name ?? 'Back-office portal'}
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="who">{user?.name}</div>
          <div className="role">{user?.role.replace(/_/g, ' ')}</div>
          <button type="button" className="link-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
