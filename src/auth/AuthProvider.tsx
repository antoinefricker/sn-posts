import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { AuthContext, type Profile, type SignUpInput } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  // The profile belongs to one user; `profileState.userId` records whose fetch has settled.
  const [profileState, setProfileState] = useState<{
    userId: string
    profile: Profile | null
  } | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const settle = (profile: Profile | null) => {
      if (!cancelled) setProfileState({ userId, profile })
    }
    supabase
      .from('profiles')
      .select('name, is_admin, club_id, club:clubs(code, name)')
      .eq('id', userId)
      .single<Profile>()
      .then(
        ({ data, error }) => {
          if (error) console.error('Could not load profile', error)
          settle(error ? null : data)
        },
        (error: unknown) => {
          console.error('Could not load profile', error)
          settle(null)
        },
      )
    return () => {
      cancelled = true
    }
  }, [userId])

  // Loading until the session is known and, when signed in, until that user's profile
  // fetch has settled; a profile fetched for another user is never exposed.
  const profileSettled = !!userId && profileState?.userId === userId
  const profile = profileSettled ? profileState.profile : null
  const loading = !sessionReady || (!!userId && !profileSettled)

  const value = {
    session,
    profile,
    loading,
    async signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    async signUp({ name, clubCode, clubName, email, password }: SignUpInput) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, club_code: clubCode, club_name: clubName } },
      })
      return error?.message ?? null
    },
    async signOut() {
      await supabase.auth.signOut()
    },
    async updateProfile({ name }: { name: string }) {
      if (!userId) return 'Not signed in'
      // RLS + column grants: users can only update their own name.
      const { data, error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', userId)
        .select('name, is_admin, club_id, club:clubs(code, name)')
        .single<Profile>()
      if (error) return error.message
      setProfileState({ userId, profile: data })
      return null
    },
    async updateAccount({ email, password }: { email?: string; password?: string }) {
      const { data, error } = await supabase.auth.updateUser({
        ...(email ? { email } : {}),
        ...(password ? { password } : {}),
      })
      if (error) return { error: error.message, pendingEmail: null }
      return { error: null, pendingEmail: data.user.new_email ?? null }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
