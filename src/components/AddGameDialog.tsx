import { useEffect, useMemo, useRef, useState } from 'react'
import { FormMessage } from '@/components/FormMessage'
import { GameForm } from '@/components/GameForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toMessage } from '@/data/errors'
import { addGameToCampaign, createGame, findGameByCode, listGames } from '@/data/games'
import type { Game, GameInput, GameWithCampaigns } from '@/data/types'
import { formatGameWhen } from '@/lib/games'

type AddGameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  /** Ids of the games already in the campaign; those cannot be added again. */
  campaignGameIds: string[]
  /** Called after a game was linked, before the dialog closes. */
  onAdded: () => Promise<void> | void
}

/** Adds a game to a campaign. Closing is ignored while a save is running. */
export function AddGameDialog({ open, onOpenChange, campaignId, campaignGameIds, onAdded }: AddGameDialogProps) {
  const [busy, setBusy] = useState(false)

  function handleOpenChange(next: boolean) {
    if (busy) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[100px] max-h-[calc(100vh-120px)] translate-y-0 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add game</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open so state resets. */}
        {open && (
          <AddGameBody
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

type Mode = 'create' | 'pick'

function AddGameBody({ busy, ...props }: BodyProps) {
  const [mode, setMode] = useState<Mode>('create')
  return (
    <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
      <TabsList aria-label="How to add a game">
        <TabsTrigger value="create" disabled={busy}>
          New game
        </TabsTrigger>
        <TabsTrigger value="pick" disabled={busy}>
          Existing game
        </TabsTrigger>
      </TabsList>
      <TabsContent value="create">
        <CreateGame {...props} />
      </TabsContent>
      <TabsContent value="pick">
        <PickGame {...props} busy={busy} />
      </TabsContent>
    </Tabs>
  )
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

function PickGame({ campaignId, campaignGameIds, onAdded, onDone, onCancel, busy, setBusy }: BodyProps) {
  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
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
    return (games ?? [])
      .filter((g) => !campaignGameIds.includes(g.id))
      .filter(
        (g) =>
          !wanted ||
          [g.code, g.team_name, g.opponent_name, g.game_date].some((v) =>
            v.toLowerCase().includes(wanted),
          ),
      )
  }, [games, campaignGameIds, query])

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
      <Input
        type="search"
        aria-label="Search games"
        placeholder="Search by code, team, opponent or date"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
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
          {query.trim()
            ? 'No games match your search.'
            : games.length === 0
              ? 'No games in your club yet. Create a new game instead.'
              : 'All club games are already in this campaign.'}
        </p>
      ) : (
        <ul className="grid max-h-72 gap-2 overflow-y-auto">
          {candidates.map((game) => (
            <li key={game.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div className="grid min-w-0 text-sm">
                <span className="font-medium">
                  {game.code} · {game.team_name} vs {game.opponent_name}
                </span>
                <span className="text-muted-foreground">{formatGameWhen(game)}</span>
              </div>
              <Button type="button" size="sm" disabled={busy} onClick={() => void link(game)}>
                {linkingId === game.id ? 'Adding…' : 'Add'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <FormMessage message={linkError ? { ok: false, text: linkError } : null} />
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
