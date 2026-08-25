import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BottomNav, type NavTab } from './components/BottomNav'
import { LoginScreen } from './screens/LoginScreen'
import { RoleUnsupportedScreen } from './screens/RoleUnsupportedScreen'
import { ChatHomeScreen } from './screens/ChatHomeScreen'
import { ConversationScreen } from './screens/ConversationScreen'
import { MyChildScreen } from './screens/MyChildScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { TeacherHomeScreen } from './screens/teacher/TeacherHomeScreen'
import { TeacherDocumentsScreen } from './screens/teacher/TeacherDocumentsScreen'
import { SupervisorHomeScreen } from './screens/supervisor/SupervisorHomeScreen'
import { EscalationsListScreen } from './screens/supervisor/EscalationsListScreen'
import { EscalationDetailScreen } from './screens/supervisor/EscalationDetailScreen'
import { StaffConversationScreen } from './screens/supervisor/StaffConversationScreen'
import { SupervisorDocumentsScreen } from './screens/supervisor/SupervisorDocumentsScreen'
import { UploadDocumentScreen } from './screens/supervisor/UploadDocumentScreen'
import { StudentHomeScreen } from './screens/student/StudentHomeScreen'
import { ClassRosterScreen } from './screens/shared/ClassRosterScreen'
import { StudentDetailScreen } from './screens/shared/StudentDetailScreen'
import { DocumentDetailScreen } from './screens/shared/DocumentDetailScreen'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="spinner">Loading…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function TabLayout({ tabs }: { tabs: NavTab[] }) {
  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav tabs={tabs} />
    </div>
  )
}

const PARENT_TABS: NavTab[] = [
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/my-child', label: 'My Child', icon: '👤' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
]

const TEACHER_TABS: NavTab[] = [
  { to: '/teacher', label: 'Home', icon: '🏠', end: true },
  { to: '/teacher/class', label: 'My Class', icon: '🎓' },
  { to: '/teacher/documents', label: 'Documents', icon: '📄' },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
]

const SUPERVISOR_TABS: NavTab[] = [
  { to: '/supervisor', label: 'Home', icon: '🏠', end: true },
  { to: '/supervisor/escalations', label: 'Escalations', icon: '⚠️' },
  { to: '/supervisor/documents', label: 'Documents', icon: '📄' },
  { to: '/supervisor/class', label: 'My Class', icon: '🎓' },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
]

const STUDENT_TABS: NavTab[] = [
  { to: '/student', label: 'Home', icon: '🏠', end: true },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
]

// Post-login landing route, per role — the mobile app (System A) covers
// Parent, Teacher, Supervisor, and a narrow Student view; everyone else
// lands on an honest "not supported here" screen (see RoleUnsupportedScreen).
function RoleHome() {
  const { user } = useAuth()
  switch (user?.role) {
    case 'PARENT':
      return <Navigate to="/chat" replace />
    case 'TEACHER':
      return <Navigate to="/teacher" replace />
    case 'SUPERVISOR':
      return <Navigate to="/supervisor" replace />
    case 'STUDENT':
      return <Navigate to="/student" replace />
    default:
      return <Navigate to="/unsupported" replace />
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<RoleHome />} />
          <Route path="/unsupported" element={<RoleUnsupportedScreen />} />

          <Route element={<TabLayout tabs={PARENT_TABS} />}>
            <Route path="/chat" element={<ChatHomeScreen />} />
            <Route path="/my-child" element={<MyChildScreen />} />
            <Route path="/notifications" element={<NotificationsScreen />} />
          </Route>
          <Route path="/chat/:conversationId" element={<ConversationScreen />} />

          <Route element={<TabLayout tabs={TEACHER_TABS} />}>
            <Route path="/teacher" element={<TeacherHomeScreen />} />
            <Route path="/teacher/class" element={<ClassRosterScreen basePath="/teacher" />} />
            <Route path="/teacher/documents" element={<TeacherDocumentsScreen />} />
          </Route>
          <Route path="/teacher/students/:studentId" element={<StudentDetailScreen basePath="/teacher" />} />
          <Route path="/teacher/documents/:documentId" element={<DocumentDetailScreen />} />

          <Route element={<TabLayout tabs={SUPERVISOR_TABS} />}>
            <Route path="/supervisor" element={<SupervisorHomeScreen />} />
            <Route path="/supervisor/escalations" element={<EscalationsListScreen />} />
            <Route path="/supervisor/documents" element={<SupervisorDocumentsScreen />} />
            <Route path="/supervisor/class" element={<ClassRosterScreen basePath="/supervisor" />} />
          </Route>
          <Route path="/supervisor/escalations/:escalationId" element={<EscalationDetailScreen />} />
          <Route path="/supervisor/conversations/:conversationId" element={<StaffConversationScreen />} />
          <Route path="/supervisor/documents/upload" element={<UploadDocumentScreen />} />
          <Route path="/supervisor/documents/:documentId" element={<DocumentDetailScreen />} />
          <Route path="/supervisor/students/:studentId" element={<StudentDetailScreen basePath="/supervisor" />} />

          <Route element={<TabLayout tabs={STUDENT_TABS} />}>
            <Route path="/student" element={<StudentHomeScreen />} />
          </Route>

          {/* Profile is shared by every role, but the tab bar shown around
              it should match whichever role the user actually has. */}
          <Route path="/profile" element={<ProfileWithRoleNav />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

function ProfileWithRoleNav() {
  const { user } = useAuth()
  const tabs =
    user?.role === 'TEACHER'
      ? TEACHER_TABS
      : user?.role === 'SUPERVISOR'
        ? SUPERVISOR_TABS
        : user?.role === 'STUDENT'
          ? STUDENT_TABS
          : PARENT_TABS
  return (
    <div className="app-shell">
      <ProfileScreen />
      <BottomNav tabs={tabs} />
    </div>
  )
}
