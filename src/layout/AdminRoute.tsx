import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/auth/AuthContext'

/** Club admins only; everyone else is sent back to the dashboard once the profile is known. */
export function AdminRoute() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile?.is_admin) return <Navigate to="/" replace />
  return <Outlet />
}
