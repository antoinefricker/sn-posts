import { Route, Routes } from 'react-router'
import { AuthForm } from './auth/AuthForm'
import { useAuth } from './auth/AuthContext'
import { AdminRoute } from './layout/AdminRoute'
import { AppLayout } from './layout/AppLayout'
import { AccountPage } from './pages/AccountPage'
import { CreateUserPage } from './pages/CreateUserPage'
import { DashboardPage } from './pages/DashboardPage'
import { GamesPage } from './pages/GamesPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center text-muted-foreground">
        Loading…
      </main>
    )
  }
  if (!session) return <AuthForm />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route element={<AdminRoute />}>
          <Route path="users/new" element={<CreateUserPage />} />
        </Route>
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}

export default App
