import { useState } from 'react'
import { FormMessage } from '@/components/FormMessage'
import { GameForm } from '@/components/GameForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toMessage } from '@/data/errors'
import { addGameToProject, createGame, findGameByCode } from '@/data/games'
import type { Game, GameInput } from '@/data/types'
import { formatGameWhen } from '@/components/GameRow'

type AddGameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** Ids of the games already in the project; those cannot be added again. */
  projectGameIds: string[]
  /** Called after a game was linked, before the dialog closes. */
  onAdded: () => Promise<void> | void
}

/** Adds a game to a project. Closing is ignored while a save is running. */
export function AddGameDialog({ open, onOpenChange, projectId, projectGameIds, onAdded }: AddGameDialogProps) {
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
            projectGameIds={projectGameIds}
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
  projectGameIds: string[]
  onAdded: () => Promise<void> | void
  onDone: () => void
  onCancel: () => void
  setBusy: (busy: boolean) => void
}

function isDuplicateCodeError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === '23505'
}

function CreateGame({ projectId, projectGameIds, onAdded, onDone, onCancel, setBusy }: BodyProps) {
  const [duplicate, setDuplicate] = useState<Game | null>(null)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  async function handleSubmit(input: GameInput) {
    setDuplicate(null)
    setLinkError(null)
    // A code that exists in the club is offered for reuse instead of failing on the unique index.
    const existing = await findGameByCode(input.code)
    if (existing) {
      setDuplicate(existing)
      return
    }
    let game: Game
    try {
      game = await createGame(input)
    } catch (e) {
      // Someone created the same code between the lookup and the insert.
      const raced = isDuplicateCodeError(e) ? await findGameByCode(input.code) : null
      if (!raced) throw e
      setDuplicate(raced)
      return
    }
    await addGameToProject(projectId, game.id)
    onDone()
    await onAdded()
  }

  async function linkExisting(game: Game) {
    setLinkError(null)
    setLinking(true)
    setBusy(true)
    try {
      await addGameToProject(projectId, game.id)
      onDone()
      await onAdded()
    } catch (e) {
      setLinkError(toMessage(e))
    } finally {
      setLinking(false)
      setBusy(false)
    }
  }

  const alreadyInProject = duplicate !== null && projectGameIds.includes(duplicate.id)

  return (
    <div className="grid gap-4">
      {duplicate && (
        <div role="status" className="grid gap-2 rounded-md border p-3 text-sm">
          <p>
            A game with code <strong>{duplicate.code}</strong> already exists in your club:{' '}
            {duplicate.team_name} vs {duplicate.opponent_name}, {formatGameWhen(duplicate)}.
          </p>
          {alreadyInProject ? (
            <p className="text-muted-foreground">It is already in this project.</p>
          ) : (
            <div>
              <Button type="button" disabled={linking} onClick={() => void linkExisting(duplicate)}>
                {linking ? 'Adding…' : 'Use the existing game'}
              </Button>
            </div>
          )}
          <FormMessage message={linkError ? { ok: false, text: linkError } : null} />
        </div>
      )}
      <fieldset disabled={linking} className="min-w-0 border-0 p-0">
        <GameForm onSubmit={handleSubmit} onBusyChange={setBusy} onCancel={onCancel} />
      </fieldset>
    </div>
  )
}
