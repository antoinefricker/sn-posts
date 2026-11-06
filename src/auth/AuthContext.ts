import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type Profile = { name: string; club_id: string }

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
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
