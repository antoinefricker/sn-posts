import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CampaignForm } from '@/components/CampaignForm'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { createCampaign, deleteCampaign, listCampaigns, updateCampaign } from '@/data/campaigns'
import { toMessage } from '@/data/errors'
import { deleteCampaignDescription } from '@/lib/campaigns'
import type { Campaign } from '@/data/types'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function formatDate(value: string): string {
  return dateFormat.format(new Date(value))
}

function gamesLabel(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Campaign | null>(null)
  const [editing, setEditing] = useState<Campaign | undefined>(undefined)

  const load = useCallback(async () => {
    setError(null)
    try {
      setCampaigns(await listCampaigns())
    } catch (e) {
      setError(toMessage(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign)
    setFormOpen(true)
  }

  async function handleSubmit(title: string) {
    if (editing) await updateCampaign(editing.id, title)
    else await createCampaign(title)
    setFormOpen(false)
    await load()
  }

  async function handleDelete() {
    if (!deleting) return
    await deleteCampaign(deleting.id)
    setDeleting(null)
    await load()
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Button onClick={openCreate}>New campaign</Button>
      </div>
      {error ? (
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : campaigns === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-muted-foreground">No campaigns yet. Create the first one.</p>
      ) : (
        <ul className="grid gap-3">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="grid gap-1">
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {campaign.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {campaign.creator_name ?? 'Unknown member'} · Created {formatDate(campaign.created_at)}{' '}
                      · Updated {formatDate(campaign.updated_at)} · {gamesLabel(campaign.game_count)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(campaign)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleting(campaign)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <CampaignForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={`Delete "${deleting?.title ?? ''}"?`}
        description={deleteCampaignDescription(deleting?.game_count ?? 0)}
        confirmLabel="Delete campaign"
        onConfirm={handleDelete}
      />
    </div>
  )
}
