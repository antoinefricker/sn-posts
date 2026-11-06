import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type Profile = {
  name: string
  is_admin: boolean
  club_id: string
  club: { code: string; name: string }
}

export type SignUpInput = {
  name: string
  clubId: string
  email: string
  password: string
}

export type AuthValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** Each action resolves to an error message, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (input: SignUpInput) => Promise<string | null>
  signOut: () => Promise<void>
  /** Edit the signed-in user's own name and club ID. */
  updateProfile: (input: { name: string; clubId: string }) => Promise<string | null>
  /**
   * Change the signed-in user's email and/or password. `pendingEmail` is set when the
   * project requires confirming the new address before it takes effect.
   */
  updateAccount: (input: {
    email?: string
    password?: string
  }) => Promise<{ error: string | null; pendingEmail: string | null }>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
