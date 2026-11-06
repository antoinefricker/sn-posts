import { useState } from 'react'
import { GameForm } from '@/components/GameForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { addGameToProject, createGame } from '@/data/games'
import type { GameInput } from '@/data/types'

type AddGameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** Called after a game was linked, before the dialog closes. */
  onAdded: () => Promise<void> | void
}

/** Adds a game to a project. Closing is ignored while a save is running. */
export function AddGameDialog({ open, onOpenChange, projectId, onAdded }: AddGameDialogProps) {
  const [busy, setBusy] = useState(false)

  function handleOpenChange(next: boolean) {
    if (busy) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add game</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open so state resets. */}
        {open && (
          <CreateGame
            projectId={projectId}
            onAdded={onAdded}
            onDone={() => onOpenChange(false)}
            onCancel={() => handleOpenChange(false)}
            setBusy={setBusy}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type BodyProps = {
  projectId: string
  onAdded: () => Promise<void> | void
  onDone: () => void
  onCancel: () => void
  setBusy: (busy: boolean) => void
}

function CreateGame({ projectId, onAdded, onDone, onCancel, setBusy }: BodyProps) {
  async function handleSubmit(input: GameInput) {
    const game = await createGame(input)
    await addGameToProject(projectId, game.id)
    onDone()
    await onAdded()
  }

  return <GameForm onSubmit={handleSubmit} onBusyChange={setBusy} onCancel={onCancel} />
}
