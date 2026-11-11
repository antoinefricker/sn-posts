import { Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CampaignLinks } from '@/components/CampaignLinks'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CreateGameDialog } from '@/components/CreateGameDialog'
import { GameActions } from '@/components/GameActions'
import { GamesTable } from '@/components/GamesTable'
import { ImportGamesDialog } from '@/components/ImportGamesDialog'
import { Button } from '@/components/ui/button'
import { toMessage } from '@/data/errors'
import { deleteAllGames, listGames } from '@/data/games'
import type { GameWithCampaigns } from '@/data/types'
import { deleteAllGamesDescription } from '@/lib/games'

export function GamesPage() {
  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  // Only the latest request may write state, so a slow older response cannot overwrite a newer one.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setError(null)
    try {
      const list = await listGames()
      if (id === requestId.current) setGames(list)
    } catch (e) {
      if (id === requestId.current) setError(toMessage(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Games</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={games === null}>
            <Upload data-icon="inline-start" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteAllOpen(true)}
            disabled={!games || games.length === 0}
          >
            <Trash2 data-icon="inline-start" />
            Delete all
          </Button>
          <Button onClick={() => setAddOpen(true)}>Add game</Button>
        </div>
      </div>
      <CreateGameDialog open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
      <ImportGamesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existing={games ?? []}
        onImported={load}
      />
      {games && games.length > 0 && (
        <ConfirmDialog
          open={deleteAllOpen}
          onOpenChange={setDeleteAllOpen}
          title={`Delete all ${games.length} games?`}
          description={deleteAllGamesDescription(
            games.length,
            games.filter((g) => g.campaigns.length > 0).length,
          )}
          confirmLabel="Delete all games"
          onConfirm={async () => {
            await deleteAllGames()
            setDeleteAllOpen(false)
            await load()
          }}
        />
      )}
      {error ? (
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : games === null ? (
        <p className="text-muted-foreground">Loading games…</p>
      ) : games.length === 0 ? (
        <div className="grid gap-1">
          <p className="font-medium">No games yet</p>
          <p className="text-sm text-muted-foreground">Add a game here, from a campaign page, or import a CSV file.</p>
        </div>
      ) : (
        <GamesTable
          games={games}
          campaigns={(game) => <CampaignLinks campaigns={game.campaigns} />}
          actions={(game) => <GameActions game={game} onChanged={load} />}
        />
      )}
    </div>
  )
}
