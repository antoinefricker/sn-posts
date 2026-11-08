import { useState } from 'react'
import { Pencil, Trash2, Unlink } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { GameForm } from '@/components/GameForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteGame, removeGameFromCampaign, updateGame } from '@/data/games'
import type { GameInput, GameWithCampaigns } from '@/data/types'
import { deleteGameDescription } from '@/lib/games'

type GameActionsProps = {
  game: GameWithCampaigns
  /** When set, the row offers "Remove from campaign" for this campaign. */
  campaignId?: string
  /** Refreshes the caller's list; called after every successful change and expected not to throw. */
  onChanged: () => Promise<void> | void
}

/**
 * Edit, delete and (on a campaign page) remove-from-campaign for one game row. The game is a prop of
 * the row, so the dialogs keep their content while they animate closed.
 */
export function GameActions({ game, campaignId, onChanged }: GameActionsProps) {
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
    if (!campaignId) return
    await removeGameFromCampaign(campaignId, game.id)
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
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Edit ${game.code}`}
        title="Edit"
        onClick={() => setEditOpen(true)}
      >
        <Pencil />
      </Button>
      {campaignId && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Remove ${game.code} from campaign`}
          title="Remove from campaign"
          onClick={() => setRemoveOpen(true)}
        >
          <Unlink />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Delete ${game.code}`}
        title="Delete"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 />
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
              usedInCampaigns={game.campaigns.length}
              onSubmit={handleEdit}
              onBusyChange={setSaving}
              onCancel={() => handleEditOpenChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      {campaignId && (
        <ConfirmDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          title={`Remove ${game.code} from this campaign?`}
          description="Only the link is removed. The game stays in the club and in its other campaigns."
          confirmLabel="Remove from campaign"
          onConfirm={handleRemove}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${game.code}?`}
        description={deleteGameDescription(game.campaigns.length)}
        confirmLabel="Delete game"
        onConfirm={handleDelete}
      />
    </>
  )
}
