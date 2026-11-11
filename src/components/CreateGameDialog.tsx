import { useState } from 'react'
import { GameForm } from '@/components/GameForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createGame } from '@/data/games'
import type { GameInput } from '@/data/types'

type CreateGameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Refreshes the caller's list after the game was created. */
  onCreated: () => Promise<void> | void
}

/** Creates a club game that is not linked to any campaign. Closing is ignored while saving. */
export function CreateGameDialog({ open, onOpenChange, onCreated }: CreateGameDialogProps) {
  const [saving, setSaving] = useState(false)

  function handleOpenChange(next: boolean) {
    if (saving) return
    onOpenChange(next)
  }

  async function handleSubmit(input: GameInput) {
    await createGame(input)
    onOpenChange(false)
    await onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add game</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open so the form starts empty each time. */}
        {open && (
          <GameForm
            onSubmit={handleSubmit}
            onBusyChange={setSaving}
            onCancel={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
