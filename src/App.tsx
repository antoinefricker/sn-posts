import { Navigate, Route, Routes } from 'react-router'
import { AuthForm } from './auth/AuthForm'
import { useAuth } from './auth/AuthContext'
import { Button } from './components/ui/button'
import { AdminRoute } from './layout/AdminRoute'
import { AppLayout } from './layout/AppLayout'
import { AccountPage } from './pages/AccountPage'
import { CreateUserPage } from './pages/CreateUserPage'
import { DashboardPage } from './pages/DashboardPage'
import { GamesPage } from './pages/GamesPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'
import { CampaignsPage } from './pages/CampaignsPage'

function App() {
  const { session, profile, loading, reloadProfile, signOut } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center text-muted-foreground">
        Loading…
      </main>
    )
  }
  if (!session) return <AuthForm />
  if (!profile) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">Your account is not available</h1>
        <p className="max-w-sm text-muted-foreground">
          We could not load your profile. Check your connection and try again, or sign out.
        </p>
        <div className="flex gap-2">
          <Button onClick={reloadProfile}>Try again</Button>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </main>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route element={<AdminRoute />}>
          <Route path="users/new" element={<CreateUserPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
