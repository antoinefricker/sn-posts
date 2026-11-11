import { Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CampaignLinks } from '@/components/CampaignLinks'
import { GameActions } from '@/components/GameActions'
import { GamesTable } from '@/components/GamesTable'
import { ImportGamesDialog } from '@/components/ImportGamesDialog'
import { Button } from '@/components/ui/button'
import { toMessage } from '@/data/errors'
import { listGames } from '@/data/games'
import type { GameWithCampaigns } from '@/data/types'

export function GamesPage() {
  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
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
        <Button variant="outline" onClick={() => setImportOpen(true)} disabled={games === null}>
          <Upload data-icon="inline-start" />
          Import CSV
        </Button>
      </div>
      <ImportGamesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existing={games ?? []}
        onImported={load}
      />
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
          <p className="text-sm text-muted-foreground">Games are added from a campaign page, or imported from a CSV file.</p>
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
