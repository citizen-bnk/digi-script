import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SchoolProvider } from './context/SchoolContext'
import AppShell, { navForRole } from './components/AppShell'
import LoginScreen from './screens/LoginScreen'
import RoleUnsupportedScreen from './screens/RoleUnsupportedScreen'
import DashboardScreen from './screens/DashboardScreen'
import SchoolsScreen from './screens/SchoolsScreen'
import DocumentsScreen from './screens/DocumentsScreen'
import DocumentDetailScreen from './screens/DocumentDetailScreen'
import UsersScreen from './screens/UsersScreen'
import StudentsScreen from './screens/StudentsScreen'
import EscalationsScreen from './screens/EscalationsScreen'
import AuditScreen from './screens/AuditScreen'

const BACK_OFFICE_ROLES = ['SYSTEM_OWNER', 'SUPER_USER', 'SUPPORT']

// Vite's BASE_URL always carries a trailing slash ("/admin/"), but React
// Router requires the URL to *start with* the basename — and "/admin" does
// not start with "/admin/", so the router silently renders nothing and the
// page comes up blank. Strip it, keeping "/" when the app is served from
// the root.
const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/'

/**
 * Routes are filtered by role rather than rendered and then hidden, so a
 * SUPPORT user who types /users lands on their dashboard instead of a
 * screen whose every request would 403.
 */
function RoleRoute({ path, element }: { path: string; element: ReactElement }) {
  const { user } = useAuth()
  const allowed = navForRole(user?.role ?? '').some((item) => path.startsWith(item.to))
  return allowed ? element : <Navigate to="/dashboard" replace />
}

function Shell() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="state" style={{ paddingTop: 80 }}>Loading…</div>
  }
  if (!user) {
    return <LoginScreen />
  }
  if (!BACK_OFFICE_ROLES.includes(user.role)) {
    return <RoleUnsupportedScreen />
  }

  return (
    <SchoolProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/schools" element={<RoleRoute path="/schools" element={<SchoolsScreen />} />} />
          <Route path="/documents" element={<RoleRoute path="/documents" element={<DocumentsScreen />} />} />
          <Route
            path="/documents/:documentId"
            element={<RoleRoute path="/documents" element={<DocumentDetailScreen />} />}
          />
          <Route path="/escalations" element={<RoleRoute path="/escalations" element={<EscalationsScreen />} />} />
          <Route path="/users" element={<RoleRoute path="/users" element={<UsersScreen />} />} />
          <Route path="/students" element={<RoleRoute path="/students" element={<StudentsScreen />} />} />
          <Route path="/audit" element={<RoleRoute path="/audit" element={<AuditScreen />} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </SchoolProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  )
}
