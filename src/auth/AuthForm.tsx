import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'

export function AuthForm() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isSignUp = mode === 'signup'

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const field = (k: string) => String(form.get(k) ?? '').trim()
    setBusy(true)
    setError(null)
    const message = isSignUp
      ? await signUp({
          name: field('name'),
          clubId: field('clubId'),
          email: field('email'),
          password: String(form.get('password') ?? ''),
        })
      : await signIn(field('email'), String(form.get('password') ?? ''))
    setError(message)
    setBusy(false)
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h1>{isSignUp ? 'Create an account' : 'Sign in'}</h1>
      {isSignUp && (
        <>
          <label>
            Name
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Club ID
            <input name="clubId" required />
          </label>
        </>
      )}
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          minLength={6}
          required
        />
      </label>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}
      </button>
      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(isSignUp ? 'signin' : 'signup')
          setError(null)
        }}
      >
        {isSignUp ? 'Have an account? Sign in' : 'No account? Sign up'}
      </button>
    </form>
  )
}
