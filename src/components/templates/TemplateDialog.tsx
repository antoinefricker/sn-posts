import { useState } from 'react'
import type { FormEvent } from 'react'
import { FormMessage } from '@/components/FormMessage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toMessage } from '@/data/errors'
import type { CampaignTemplate, FocusConfig, IntroConfig, TemplateConfig, TemplateType } from '@/data/types'
import { TEMPLATE_TYPE_LABELS, defaultConfig, validateConfig } from '@/lib/templates'
import { TemplateFields } from './TemplateForms'

/** Config with text fields trimmed, ready for validation and saving. */
function trimConfig(type: TemplateType, config: TemplateConfig): TemplateConfig {
  switch (type) {
    case 'intro': {
      const c = config as IntroConfig
      return { ...c, title: c.title.trim(), subtitle: c.subtitle.trim() }
    }
    case 'focus': {
      const c = config as FocusConfig
      return { ...c, badge: c.badge.trim(), title: c.title.trim() }
    }
    case 'games':
      return config
  }
}

type TemplateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing; absent when adding. */
  template?: CampaignTemplate
  /** Required when adding. */
  type?: TemplateType
  onSubmit: (type: TemplateType, config: TemplateConfig) => Promise<void>
}

/** Add/edit dialog. Closing is the caller's job after a successful onSubmit. */
export function TemplateDialog({ open, onOpenChange, template, type, onSubmit }: TemplateDialogProps) {
  const [busy, setBusy] = useState(false)
  const resolvedType = template?.type ?? type

  // Esc, backdrop and the close button are swallowed while a save is running.
  function handleOpenChange(next: boolean) {
    if (busy) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {resolvedType
              ? `${template ? 'Edit' : 'Add'} ${TEMPLATE_TYPE_LABELS[resolvedType]} template`
              : 'Template'}
          </DialogTitle>
        </DialogHeader>
        {/* Remounted per open so state resets. */}
        {open && resolvedType && (
          <TemplateDialogBody
            key={template?.id ?? `new-${resolvedType}`}
            type={resolvedType}
            initial={template?.config}
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

function TemplateDialogBody({
  type,
  initial,
  onSubmit,
  onCancel,
  busy,
  setBusy,
}: {
  type: TemplateType
  initial?: TemplateConfig
  onSubmit: (type: TemplateType, config: TemplateConfig) => Promise<void>
  onCancel: () => void
  busy: boolean
  setBusy: (busy: boolean) => void
}) {
  const [config, setConfig] = useState<TemplateConfig>(initial ?? defaultConfig(type))
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const trimmed = trimConfig(type, config)
    const invalid = validateConfig(type, trimmed)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSubmit(type, trimmed)
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <TemplateFields type={type} config={config} onChange={setConfig} busy={busy} />
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
