import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CampaignForm } from '@/components/CampaignForm'
import { CampaignStatusBadge } from '@/components/CampaignStatusBadge'
import { ArrowLeft } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toMessage } from '@/data/errors'
import { AddGameDialog } from '@/components/AddGameDialog'
import { GameActions } from '@/components/GameActions'
import { GamesTable } from '@/components/GamesTable'
import { listCampaignGames } from '@/data/games'
import { deleteCampaign, getCampaign, updateCampaign } from '@/data/campaigns'
import type { GameWithCampaigns, Campaign, CampaignInput } from '@/data/types'
import { deleteCampaignDescription } from '@/lib/campaigns'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

type CampaignState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; campaign: Campaign }

/** Keyed by id so navigating between campaigns starts from a fresh loading state. */
export function CampaignDetailPage() {
  const { campaignId = '' } = useParams()
  return <CampaignDetail key={campaignId} campaignId={campaignId} />
}

function CampaignDetail({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate()
  const [state, setState] = useState<CampaignState>({ status: 'loading' })
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  // Only the latest request may write state, so a slow older response cannot overwrite a newer one.
  const requestId = useRef(0)

  const loadCampaign = useCallback(async () => {
    const id = ++requestId.current
    try {
      const campaign = await getCampaign(campaignId)
      if (id !== requestId.current) return
      setState(campaign ? { status: 'ready', campaign } : { status: 'not-found' })
    } catch (e) {
      if (id !== requestId.current) return
      setState({ status: 'error', message: toMessage(e) })
    }
  }, [campaignId])

  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const gamesRequestId = useRef(0)

  const loadGames = useCallback(async () => {
    const id = ++gamesRequestId.current
    setGamesError(null)
    try {
      const list = await listCampaignGames(campaignId)
      if (id === gamesRequestId.current) setGames(list)
    } catch (e) {
      if (id === gamesRequestId.current) setGamesError(toMessage(e))
    }
  }, [campaignId])

  useEffect(() => {
    void loadCampaign()
    void loadGames()
  }, [loadCampaign, loadGames])

  /** Reload after any change; linking games also bumps the campaign's updated_at. */
  const refresh = useCallback(async () => {
    await Promise.all([loadCampaign(), loadGames()])
  }, [loadCampaign, loadGames])

  if (state.status === 'loading') return <p className="text-muted-foreground">Loading…</p>
  if (state.status === 'error') {
    return (
      <div role="alert" className="grid justify-items-start gap-2">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button variant="outline" onClick={() => void loadCampaign()}>
          Retry
        </Button>
      </div>
    )
  }
  if (state.status === 'not-found') {
    return (
      <div className="grid justify-items-start gap-2">
        <h1 className="text-2xl font-semibold">Campaign not found</h1>
        <p className="text-muted-foreground">It may have been deleted.</p>
        <Link to="/campaigns" className="underline underline-offset-4">
          Back to campaigns
        </Link>
      </div>
    )
  }

  const { campaign } = state

  async function handleEdit(input: CampaignInput) {
    await updateCampaign(campaign.id, input)
    setEditOpen(false)
    await refresh()
  }

  async function handleDelete() {
    await deleteCampaign(campaign.id)
    setDeleteOpen(false)
    navigate('/campaigns')
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link
            to="/campaigns"
            aria-label="Back to campaigns"
            className={buttonVariants({ variant: 'outline', size: 'icon-lg' })}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{campaign.title}</h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created {dateFormat.format(new Date(campaign.created_at))} by{' '}
              {campaign.creator_name ?? 'Unknown member'} · Updated {dateFormat.format(new Date(campaign.updated_at))}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>
      <Separator />
      <section className="grid gap-3" aria-labelledby="games-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="games-heading" className="text-lg font-semibold">
            Games
          </h2>
          <Button onClick={() => setAddOpen(true)}>Add game(s)</Button>
        </div>
        {gamesError ? (
          <div role="alert" className="grid justify-items-start gap-2">
            <p className="text-sm text-destructive">{gamesError}</p>
            <Button variant="outline" onClick={() => void loadGames()}>
              Retry
            </Button>
          </div>
        ) : games === null ? (
          <p className="text-muted-foreground">Loading games…</p>
        ) : games.length === 0 ? (
          <p className="text-muted-foreground">No games in this campaign yet.</p>
        ) : (
          <GamesTable
            games={games}
            actions={(game) => <GameActions game={game} campaignId={campaign.id} onChanged={refresh} />}
          />
        )}
      </section>
      <AddGameDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        campaignId={campaign.id}
        campaignGameIds={games?.map((g) => g.id) ?? []}
        onAdded={refresh}
      />
      <CampaignForm open={editOpen} onOpenChange={setEditOpen} initial={campaign} onSubmit={handleEdit} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${campaign.title}"?`}
        description={deleteCampaignDescription(games?.length ?? campaign.game_count)}
        confirmLabel="Delete campaign"
        onConfirm={handleDelete}
      />
    </div>
  )
}
