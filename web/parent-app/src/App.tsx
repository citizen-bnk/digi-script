import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BottomNav } from './components/BottomNav'
import { LoginScreen } from './screens/LoginScreen'
import { ChatHomeScreen } from './screens/ChatHomeScreen'
import { ConversationScreen } from './screens/ConversationScreen'
import { MyChildScreen } from './screens/MyChildScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { ProfileScreen } from './screens/ProfileScreen'

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

function TabLayout() {
  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route element={<RequireAuth />}>
          <Route element={<TabLayout />}>
            <Route path="/chat" element={<ChatHomeScreen />} />
            <Route path="/my-child" element={<MyChildScreen />} />
            <Route path="/notifications" element={<NotificationsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
          </Route>
          <Route path="/chat/:conversationId" element={<ConversationScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </AuthProvider>
  )
}
