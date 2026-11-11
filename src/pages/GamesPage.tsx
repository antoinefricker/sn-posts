import { Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CampaignLinks } from '@/components/CampaignLinks'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CreateGameDialog } from '@/components/CreateGameDialog'
import { GameActions } from '@/components/GameActions'
import { GamesTable } from '@/components/GamesTable'
import { ImportGamesDialog } from '@/components/ImportGamesDialog'
import { Pagination } from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toMessage } from '@/data/errors'
import { deleteAllGames, listGames } from '@/data/games'
import type { GameWithCampaigns } from '@/data/types'
import { deleteAllGamesDescription, filterGamesByRange } from '@/lib/games'
import { paginate } from '@/lib/pagination'

const PAGE_SIZE = 20

export function GamesPage() {
  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
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

  const visibleGames = useMemo(
    () => (games ? filterGamesByRange(games, rangeStart, rangeEnd) : null),
    [games, rangeStart, rangeEnd],
  )
  // paginate() clamps the page, so deleting or filtering games never leaves an empty page.
  const page = useMemo(() => paginate(visibleGames ?? [], pageNumber, PAGE_SIZE), [visibleGames, pageNumber])
  const filtering = rangeStart !== '' || rangeEnd !== ''

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
      {games && games.length > 0 && (
        <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filter by date">
          <div className="grid gap-1">
            <Label htmlFor="field-range-start">From</Label>
            <Input
              id="field-range-start"
              type="datetime-local"
              value={rangeStart}
              max={rangeEnd || undefined}
              onChange={(e) => {
                setRangeStart(e.target.value)
                setPageNumber(1)
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="field-range-end">To</Label>
            <Input
              id="field-range-end"
              type="datetime-local"
              value={rangeEnd}
              min={rangeStart || undefined}
              onChange={(e) => {
                setRangeEnd(e.target.value)
                setPageNumber(1)
              }}
            />
          </div>
          {filtering && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setRangeStart('')
                  setRangeEnd('')
                  setPageNumber(1)
                }}
              >
                Clear
              </Button>
              <p className="pb-2 text-sm text-muted-foreground" aria-live="polite">
                {visibleGames?.length ?? 0} of {games.length} games
              </p>
            </>
          )}
        </div>
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
      ) : visibleGames?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No games in this date range.</p>
      ) : (
        <>
          <GamesTable
            games={page.items}
            campaigns={(game) => <CampaignLinks campaigns={game.campaigns} />}
            actions={(game) => <GameActions game={game} onChanged={load} />}
          />
          <Pagination page={page} noun="games" onPageChange={setPageNumber} />
        </>
      )}
    </div>
  )
}
