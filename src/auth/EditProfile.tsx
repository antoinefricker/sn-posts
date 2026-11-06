import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'

type Message = { ok: boolean; text: string } | null

/** Lets the signed-in user edit their own information. */
export function EditProfile() {
  const { session, profile, updateProfile, updateAccount } = useAuth()
  const [message, setMessage] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!session || !profile) return null
  const currentEmail = session.user.email ?? ''

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const name = String(form.get('name') ?? '').trim()
    const clubId = String(form.get('clubId') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    setBusy(true)
    setMessage(null)

    const notes: string[] = []
    if (name !== profile!.name || clubId !== profile!.club_id) {
      const err = await updateProfile({ name, clubId })
      if (err) return finish({ ok: false, text: err })
      notes.push('Profile updated')
    }
    const emailChanged = email !== currentEmail
    if (emailChanged || password) {
      const res = await updateAccount({
        email: emailChanged ? email : undefined,
        password: password || undefined,
      })
      if (res.error) return finish({ ok: false, text: res.error })
      if (password) notes.push('Password changed')
      if (emailChanged) {
        notes.push(
          res.pendingEmail
            ? `Check ${res.pendingEmail} to confirm the new email address`
            : 'Email updated',
        )
      }
    }
    const passwordInput = formEl.elements.namedItem('password')
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = ''
    finish({ ok: true, text: notes.length ? notes.join('. ') + '.' : 'Nothing to change.' })

    function finish(m: Message) {
      setMessage(m)
      setBusy(false)
    }
  }

  return (
    // Re-key on saved values so the inputs reset to what is stored.
    <form
      key={`${profile.name}|${profile.club_id}|${currentEmail}`}
      className="auth-form admin-form"
      onSubmit={onSubmit}
    >
      <h2>Your information</h2>
      <label>
        Name
        <input name="name" defaultValue={profile.name} required />
      </label>
      <label>
        Club ID
        <input name="clubId" defaultValue={profile.club_id} required />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={currentEmail} autoComplete="email" required />
      </label>
      <label>
        New password (leave empty to keep the current one)
        <input name="password" type="password" minLength={6} autoComplete="new-password" />
      </label>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'auth-ok' : 'auth-error'}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
