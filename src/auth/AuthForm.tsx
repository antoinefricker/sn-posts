import { useEffect, useState, type FormEvent } from 'react'
import { FormField } from '@/components/FormField'
import { FormMessage } from '@/components/FormMessage'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { supabase } from '../supabase'
import { useAuth } from './AuthContext'

/** Public sign-up is only open for the very first (admin) account; the database enforces it. */
async function fetchSignupOpen(): Promise<boolean> {
  const { data, error } = await supabase.rpc('signup_open')
  return error ? true : data === true
}

export function AuthForm() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const isSignUp = mode === 'signup' && signupOpen

  useEffect(() => {
    fetchSignupOpen().then(setSignupOpen)
  }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const field = (k: string) => String(form.get(k) ?? '').trim()
    setBusy(true)
    setError(null)
    const message = isSignUp
      ? await signUp({
          name: field('name'),
          clubCode: field('clubCode'),
          clubName: field('clubName'),
          email: field('email'),
          password: String(form.get('password') ?? ''),
        })
      : await signIn(field('email'), String(form.get('password') ?? ''))
    if (message && isSignUp && !(await fetchSignupOpen())) {
      setSignupOpen(false)
      setMode('signin')
      setError('Sign-up is closed. Please sign in, or ask an admin to create your account.')
    } else {
      setError(message)
    }
    setBusy(false)
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={onSubmit} className="grid gap-4">
          <CardHeader>
            <CardTitle>{isSignUp ? 'Create an account' : 'Sign in'}</CardTitle>
            <CardDescription>
              {isSignUp
                ? 'The first account becomes the administrator.'
                : 'Enter your email and password to continue.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isSignUp && (
              <>
                <FormField label="Name" name="name" autoComplete="name" required />
                <FormField label="Club code" name="clubCode" required />
                <FormField label="Club name" name="clubName" required />
              </>
            )}
            <FormField label="Email" name="email" type="email" autoComplete="email" required />
            <FormField
              label="Password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
            <FormMessage message={error ? { ok: false, text: error } : null} />
          </CardContent>
          <CardFooter className="grid gap-2">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}
            </Button>
            {signupOpen && (
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setMode(isSignUp ? 'signin' : 'signup')
                  setError(null)
                }}
              >
                {isSignUp ? 'Have an account? Sign in' : 'No account? Sign up'}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
