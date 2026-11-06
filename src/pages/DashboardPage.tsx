import { useAuth } from '@/auth/AuthContext'

export function DashboardPage() {
  const { session, profile } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Welcome{profile ? `, ${profile.name}` : ''}
      </h1>
      <p className="text-sm text-muted-foreground">
        {session?.user.email}
        {profile && ` · Club ${profile.club.name}`}
      </p>
    </div>
  )
}
