import { useState, type FormEvent } from 'react'
import { FormField } from '@/components/FormField'
import { FormMessage, type FormMessageValue } from '@/components/FormMessage'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from './AuthContext'

/** Lets the signed-in user edit their own information. */
export function EditProfile() {
  const { session, profile, updateProfile, updateAccount } = useAuth()
  const [message, setMessage] = useState<FormMessageValue>(null)
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

    function finish(m: FormMessageValue) {
      setMessage(m)
      setBusy(false)
    }
  }

  return (
    // Re-key on saved values so the inputs reset to what is stored.
    <Card key={`${profile.name}|${profile.club_id}|${currentEmail}`}>
      <form onSubmit={onSubmit} className="grid gap-4">
        <CardHeader>
          <CardTitle>Your information</CardTitle>
          <CardDescription>Update your name, club, email or password.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="Name" name="name" defaultValue={profile.name} required />
          <FormField label="Club ID" name="clubId" defaultValue={profile.club_id} required />
          <FormField
            label="Email"
            name="email"
            type="email"
            defaultValue={currentEmail}
            autoComplete="email"
            required
          />
          <FormField
            label="New password (leave empty to keep the current one)"
            name="password"
            type="password"
            minLength={6}
            autoComplete="new-password"
          />
          <FormMessage message={message} />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
