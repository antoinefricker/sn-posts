import { useEffect, useMemo, useRef, useState } from 'react'
import { FormMessage } from '@/components/FormMessage'
import { GameForm } from '@/components/GameForm'
import { GamesTable } from '@/components/GamesTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from 'cn'
import { toMessage } from '@/data/errors'
import { addGameToCampaign, addGamesToCampaign, createGame, findGameByCode, listGames } from '@/data/games'
import type { Game, GameInput, GameWithCampaigns } from '@/data/types'
import { filterGamesByRange, formatGameWhen } from '@/lib/games'

export type AddGameMode = 'create' | 'pick'

const TITLES: Record<AddGameMode, string> = { create: 'Create and link new game', pick: 'Link existing game(s)' }

type AddGameDialogProps = {
  open: boolean
  /** 'create' makes a new game and links it; 'pick' links a game that already exists in the club. */
  mode: AddGameMode
  onOpenChange: (open: boolean) => void
  campaignId: string
  /** Ids of the games already in the campaign; those cannot be linked again. */
  campaignGameIds: string[]
  /** Called after a game was linked, before the dialog closes. */
  onAdded: () => Promise<void> | void
}

/** Adds a game to a campaign. Closing is ignored while a save is running. */
export function AddGameDialog({ open, mode, onOpenChange, campaignId, campaignGameIds, onAdded }: AddGameDialogProps) {
  const [busy, setBusy] = useState(false)

  function handleOpenChange(next: boolean) {
    if (busy) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'top-[100px] max-h-[calc(100vh-120px)] translate-y-0 overflow-y-auto',
          mode === 'pick' ? 'sm:max-w-5xl' : 'sm:max-w-2xl',
        )}
      >
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open so state resets. */}
        {open && (
          <AddGameBody
            mode={mode}
            campaignId={campaignId}
            campaignGameIds={campaignGameIds}
            onAdded={onAdded}
            onDone={() => onOpenChange(false)}
            onCancel={() => handleOpenChange(false)}
            busy={busy}
            setBusy={setBusy}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type BodyProps = {
  campaignId: string
  campaignGameIds: string[]
  onAdded: () => Promise<void> | void
  onDone: () => void
  onCancel: () => void
  busy: boolean
  setBusy: (busy: boolean) => void
}

function AddGameBody({ mode, ...props }: BodyProps & { mode: AddGameMode }) {
  return mode === 'create' ? <CreateGame {...props} /> : <PickGame {...props} />
}

function isDuplicateCodeError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === '23505'
}

function CreateGame({
  campaignId,
  campaignGameIds,
  onAdded,
  onDone,
  onCancel,
  setBusy,
}: Omit<BodyProps, 'busy'>) {
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
    await addGameToCampaign(campaignId, game.id)
    onDone()
    await onAdded()
  }

  async function linkExisting(game: Game) {
    setLinkError(null)
    setLinking(true)
    setBusy(true)
    try {
      await addGameToCampaign(campaignId, game.id)
      onDone()
      await onAdded()
    } catch (e) {
      setLinkError(toMessage(e))
    } finally {
      setLinking(false)
      setBusy(false)
    }
  }

  const alreadyInCampaign = duplicate !== null && campaignGameIds.includes(duplicate.id)

  return (
    <div className="grid gap-4">
      {duplicate && (
        <div role="status" className="grid gap-2 rounded-md border p-3 text-sm">
          <p>
            A game with code <strong>{duplicate.code}</strong> already exists in your club:{' '}
            {duplicate.team_name} vs {duplicate.opponent_name}, {formatGameWhen(duplicate)}.
          </p>
          {alreadyInCampaign ? (
            <p className="text-muted-foreground">It is already in this campaign.</p>
          ) : (
            <div>
              <Button type="button" disabled={linking} onClick={() => void linkExisting(duplicate)}>
                {linking ? 'Linking…' : 'Use the existing game'}
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

function PickGame({ campaignId, campaignGameIds, onAdded, onDone, onCancel, busy, setBusy }: BodyProps) {
  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const id = ++requestId.current
    listGames().then(
      (list) => {
        if (id === requestId.current) setGames(list)
      },
      (e: unknown) => {
        if (id === requestId.current) setLoadError(toMessage(e))
      },
    )
    return () => {
      requestId.current++
    }
  }, [attempt])

  const candidates = useMemo(() => {
    const wanted = query.trim().toLowerCase()
    return filterGamesByRange(games ?? [], rangeStart, rangeEnd)
      .filter((g) => !campaignGameIds.includes(g.id))
      .filter(
        (g) =>
          !wanted ||
          [g.code, g.team_name, g.opponent_name, g.game_date].some((v) =>
            v.toLowerCase().includes(wanted),
          ),
      )
  }, [games, campaignGameIds, query, rangeStart, rangeEnd])
  const filtering = query.trim() !== '' || rangeStart !== '' || rangeEnd !== ''

  const [linkingAll, setLinkingAll] = useState(false)

  /** Links every game currently listed, so the filters decide which ones. */
  async function linkAll() {
    setLinkError(null)
    setLinkingAll(true)
    setBusy(true)
    try {
      await addGamesToCampaign(
        campaignId,
        candidates.map((game) => game.id),
      )
      onDone()
      await onAdded()
    } catch (e) {
      setLinkError(toMessage(e))
    } finally {
      setLinkingAll(false)
      setBusy(false)
    }
  }

  async function link(game: Game) {
    setLinkError(null)
    setLinkingId(game.id)
    setBusy(true)
    try {
      await addGameToCampaign(campaignId, game.id)
      onDone()
      await onAdded()
    } catch (e) {
      setLinkError(toMessage(e))
    } finally {
      setLinkingId(null)
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-1">
          <Label htmlFor="field-pick-search">Search</Label>
          <Input
            id="field-pick-search"
            type="search"
            placeholder="Code, team, opponent or date"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid w-52 shrink-0 gap-1">
          <Label htmlFor="field-pick-range-start">From</Label>
          <Input
            id="field-pick-range-start"
            type="datetime-local"
            value={rangeStart}
            max={rangeEnd || undefined}
            onChange={(e) => setRangeStart(e.target.value)}
          />
        </div>
        <div className="grid w-52 shrink-0 gap-1">
          <Label htmlFor="field-pick-range-end">To</Label>
          <Input
            id="field-pick-range-end"
            type="datetime-local"
            value={rangeEnd}
            min={rangeStart || undefined}
            onChange={(e) => setRangeEnd(e.target.value)}
          />
        </div>
        {/* Always rendered: showing it only when a date is set shifts the row while editing. */}
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!rangeStart && !rangeEnd}
          onClick={() => {
            setRangeStart('')
            setRangeEnd('')
          }}
        >
          Clear dates
        </Button>
      </div>
      {loadError ? (
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLoadError(null)
              setAttempt((n) => n + 1)
            }}
          >
            Retry
          </Button>
        </div>
      ) : games === null ? (
        <p className="text-muted-foreground">Loading games…</p>
      ) : candidates.length === 0 ? (
        <p className="text-muted-foreground">
          {filtering && games.length > 0
            ? 'No games match your filters.'
            : games.length === 0
              ? 'No games in your club yet. Create a new game instead.'
              : 'All club games are already in this campaign.'}
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <GamesTable
            games={candidates}
            actions={(game) => (
              <Button type="button" size="sm" disabled={busy} onClick={() => void link(game)}>
                {linkingId === game.id ? 'Linking…' : 'Link'}
              </Button>
            )}
          />
        </div>
      )}
      <FormMessage message={linkError ? { ok: false, text: linkError } : null} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          disabled={busy || candidates.length === 0}
          aria-busy={linkingAll}
          onClick={() => void linkAll()}
        >
          {linkingAll ? 'Linking…' : `Link all games (${candidates.length})`}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
