import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/auth/AuthContext'

/** Club admins only; everyone else is sent back to the dashboard. */
export function AdminRoute() {
  const { profile } = useAuth()
  if (!profile?.is_admin) return <Navigate to="/" replace />
  return <Outlet />
}
