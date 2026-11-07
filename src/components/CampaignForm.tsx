import { useState } from 'react'
import type { FormEvent } from 'react'
import { FormField } from '@/components/FormField'
import { FormMessage } from '@/components/FormMessage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toMessage } from '@/data/errors'
import type { Campaign } from '@/data/types'

type CampaignFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Campaign
  onSubmit: (title: string) => Promise<void>
}

/** Create/edit dialog. Closing is the caller's job after a successful onSubmit. */
export function CampaignForm({ open, onOpenChange, initial, onSubmit }: CampaignFormProps) {
  const [busy, setBusy] = useState(false)

  // Esc, backdrop and the close button are swallowed while a save is running.
  function handleOpenChange(next: boolean) {
    if (busy) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit campaign' : 'New campaign'}</DialogTitle>
        </DialogHeader>
        {/* Remounted per open so state resets. */}
        {open && (
          <CampaignFormBody
            key={initial?.id ?? 'new'}
            initial={initial}
            onSubmit={onSubmit}
            onCancel={() => handleOpenChange(false)}
            busy={busy}
            setBusy={setBusy}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CampaignFormBody({
  initial,
  onSubmit,
  onCancel,
  busy,
  setBusy,
}: {
  initial?: Campaign
  onSubmit: (title: string) => Promise<void>
  onCancel: () => void
  busy: boolean
  setBusy: (busy: boolean) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Title is required')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSubmit(trimmed)
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField
        label="Title"
        name="campaign_title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        autoFocus
      />
      <FormMessage message={error ? { ok: false, text: error } : null} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
