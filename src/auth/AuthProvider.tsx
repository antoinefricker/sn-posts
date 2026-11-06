import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { AuthContext, type Profile, type SignUpInput } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('name, is_admin, club_id, club:clubs(code, name)')
      .eq('id', userId)
      .single<Profile>()
      .then(({ data }) => {
        if (!cancelled) setProfile(data)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const value = {
    session,
    profile,
    loading,
    async signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    async signUp({ name, clubId, email, password }: SignUpInput) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, club_id: clubId } },
      })
      return error?.message ?? null
    },
    async signOut() {
      await supabase.auth.signOut()
    },
    async updateProfile({ name, clubId }: { name: string; clubId: string }) {
      if (!userId) return 'Not signed in'
      // RLS + column grants: users can only update their own name and club_id.
      const { data, error } = await supabase
        .from('profiles')
        .update({ name, club_id: clubId })
        .eq('id', userId)
        .select('name, is_admin, club_id, club:clubs(code, name)')
        .single<Profile>()
      if (error) return error.message
      setProfile(data)
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
