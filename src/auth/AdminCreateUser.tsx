import { useState, type FormEvent } from 'react'
import { supabase } from '../supabase'

/** Admin-only form. The `create-user` edge function re-checks the caller is an admin. */
export function AdminCreateUser() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    setBusy(true)
    setMessage(null)
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        name: String(form.get('name') ?? '').trim(),
        clubId: String(form.get('clubId') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        isAdmin: form.get('isAdmin') === 'on',
      },
    })
    if (error) {
      // Non-2xx responses carry the function's JSON error message in the response body.
      let text = error.message
      const res = (error as { context?: Response }).context
      if (res && typeof res.json === 'function') {
        text = (await res.json().catch(() => null))?.error ?? text
      }
      setMessage({ ok: false, text })
    } else {
      setMessage({ ok: true, text: `Account created for ${data.email}` })
      formEl.reset()
    }
    setBusy(false)
  }

  return (
    <form className="auth-form admin-form" onSubmit={onSubmit}>
      <h2>Create a user account</h2>
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Club ID
        <input name="clubId" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" minLength={6} autoComplete="new-password" required />
      </label>
      <label className="checkbox">
        <input name="isAdmin" type="checkbox" />
        Make this user an admin
      </label>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'auth-ok' : 'auth-error'}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>
  )
}
