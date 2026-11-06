import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminCreateUser } from './auth/AdminCreateUser'
import { AuthForm } from './auth/AuthForm'
import { useAuth } from './auth/AuthContext'
import { EditProfile } from './auth/EditProfile'

function App() {
  const { session, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center text-muted-foreground">
        Loading…
      </main>
    )
  }
  if (!session) return <AuthForm />

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="font-semibold">sn-posts</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.name ?? session.user.email}
              {profile?.is_admin && ' · admin'}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-4xl gap-6 p-4 py-8 md:grid-cols-2 md:items-start">
        <div className="md:col-span-2">
          <h1 className="text-2xl font-semibold">
            Welcome{profile ? `, ${profile.name}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.user.email}
            {profile && ` · Club ${profile.club_id}`}
          </p>
        </div>
        <EditProfile />
        {profile?.is_admin && <AdminCreateUser />}
      </main>
    </div>
  )
}

export default App
