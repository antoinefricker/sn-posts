import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { GameForm } from '@/components/GameForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteGame, removeGameFromProject, updateGame } from '@/data/games'
import type { GameInput, GameWithProjects } from '@/data/types'
import { deleteGameDescription } from '@/lib/games'

type GameActionsProps = {
  game: GameWithProjects
  /** When set, the row offers "Remove from project" for this project. */
  projectId?: string
  /** Refreshes the caller's list; called after every successful change and expected not to throw. */
  onChanged: () => Promise<void> | void
}

/**
 * Edit, delete and (on a project page) remove-from-project for one game row. The game is a prop of
 * the row, so the dialogs keep their content while they animate closed.
 */
export function GameActions({ game, projectId, onChanged }: GameActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Esc, backdrop and the close button are swallowed while a save is running.
  function handleEditOpenChange(next: boolean) {
    if (saving) return
    setEditOpen(next)
  }

  async function handleEdit(input: GameInput) {
    await updateGame(game.id, input)
    setEditOpen(false)
    await onChanged()
  }

  async function handleRemove() {
    if (!projectId) return
    await removeGameFromProject(projectId, game.id)
    setRemoveOpen(false)
    await onChanged()
  }

  async function handleDelete() {
    await deleteGame(game.id)
    setDeleteOpen(false)
    await onChanged()
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      {projectId && (
        <Button variant="outline" size="sm" onClick={() => setRemoveOpen(true)}>
          Remove from project
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
        Delete
      </Button>
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit game</DialogTitle>
          </DialogHeader>
          {/* Mounted only while open so the form starts from the current values. */}
          {editOpen && (
            <GameForm
              initial={game}
              usedInProjects={game.projects.length}
              onSubmit={handleEdit}
              onBusyChange={setSaving}
              onCancel={() => handleEditOpenChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      {projectId && (
        <ConfirmDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          title={`Remove ${game.code} from this project?`}
          description="Only the link is removed. The game stays in the club and in its other projects."
          confirmLabel="Remove from project"
          onConfirm={handleRemove}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${game.code}?`}
        description={deleteGameDescription(game.projects.length)}
        confirmLabel="Delete game"
        onConfirm={handleDelete}
      />
    </>
  )
}
