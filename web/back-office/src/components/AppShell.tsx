import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSchool } from '../context/SchoolContext'

export interface NavItem {
  to: string
  label: string
  icon: string
  /** Listed in the design but not built yet: shown, and not pretending to work. */
  soon?: boolean
}

/**
 * Nav differs by role rather than being one menu with hidden items, so the
 * sidebar never offers a destination the API would refuse. SUPPORT is the
 * narrow case: the help desk reads escalations and audit logs but has no
 * user management or student records (see ROLE_GROUPS.backOffice).
 *
 * Sections the design shows but this build does not have are listed with
 * `soon` and rendered inert. A menu that silently omits half the product
 * misrepresents where it is going; a menu of links that open nothing is
 * worse. Saying which is which is the honest middle.
 */
const CORE: Record<string, NavItem[]> = {
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

/** The rest of the back office as designed, not yet built. */
const PLANNED: NavItem[] = [
  { to: '/conversations', label: 'Conversations', icon: '💬', soon: true },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: '📚', soon: true },
  { to: '/financial', label: 'Financial Management', icon: '💰', soon: true },
  { to: '/feeding', label: 'Feeding Programme', icon: '🍲', soon: true },
  { to: '/reports', label: 'Reports & Analytics', icon: '📊', soon: true },
  { to: '/settings', label: 'Settings', icon: '⚙️', soon: true },
  { to: '/integrations', label: 'Integrations', icon: '🔌', soon: true },
  { to: '/support', label: 'Help & Support', icon: '❓', soon: true },
]

export function navForRole(role: string): NavItem[] {
  return CORE[role] ?? []
}

/** Everything the menu shows for a role, built and planned alike. */
export function fullNavForRole(role: string): NavItem[] {
  const core = navForRole(role)
  return core.length === 0 ? [] : [...core, ...PLANNED]
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const { schools, activeSchool, setActiveSchoolId } = useSchool()
  const location = useLocation()
  const items = fullNavForRole(user?.role ?? '')
  const isOwner = user?.role === 'SYSTEM_OWNER'

  // Closed on arrival. On a phone the menu used to be a full-width block
  // stacked above the page, so every screen began with the whole nav and the
  // content was somewhere below the fold.
  const [menuOpen, setMenuOpen] = useState(false)

  // Following a link on a phone should show the destination, not the menu
  // still sitting over it.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <div className={`shell${menuOpen ? ' nav-open' : ''}`}>
      {/* Phone-only header. The sidebar is the menu on a wide screen, so
          there is nothing here to open and CSS hides it. */}
      <header className="topbar">
        <button
          type="button"
          className="hamburger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="app-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <span className="topbar-title">
          <span className="sidebar-mark">◈</span>
          DigiScript
        </span>
      </header>

      {/* Catches the tap outside the drawer. Inert when the menu is closed. */}
      {menuOpen && (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside id="app-nav" className="sidebar">
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
          {items.map((item) =>
            item.soon ? (
              <span key={item.to} className="nav-soon" aria-disabled="true">
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
                <span className="nav-soon-tag">Soon</span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ),
          )}
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
