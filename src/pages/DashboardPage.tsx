import { useAuth } from '@/auth/AuthContext'
import { RecentProjectsCard } from '@/components/dashboard/RecentProjectsCard'

export function DashboardPage() {
  const { session, profile } = useAuth()
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome{profile ? `, ${profile.name}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          {session?.user.email}
          {profile && ` · Club ${profile.club.name}`}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RecentProjectsCard />
      </div>
    </div>
  )
}
