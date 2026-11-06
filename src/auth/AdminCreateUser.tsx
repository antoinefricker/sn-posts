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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { supabase } from '../supabase'

/** Admin-only form. The `create-user` edge function re-checks the caller is an admin. */
export function AdminCreateUser() {
  const [message, setMessage] = useState<FormMessageValue>(null)
  const [busy, setBusy] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    setBusy(true)
    setMessage(null)
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        name: String(form.get('name') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        isAdmin,
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
      setIsAdmin(false)
    }
    setBusy(false)
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="grid gap-4">
        <CardHeader>
          <CardTitle>Create a user account</CardTitle>
          <CardDescription>New users join your club. You can make them admins too.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="Name" name="name" required />
          <FormField label="Email" name="email" type="email" required />
          <FormField
            label="Password"
            name="password"
            type="password"
            minLength={6}
            autoComplete="new-password"
            required
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="field-isAdmin"
              checked={isAdmin}
              onCheckedChange={(checked) => setIsAdmin(checked === true)}
            />
            <Label htmlFor="field-isAdmin">Make this user an admin</Label>
          </div>
          <FormMessage message={message} />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
