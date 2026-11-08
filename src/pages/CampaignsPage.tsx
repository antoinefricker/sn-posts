import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Pencil, Trash2 } from 'lucide-react'
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
  // `?new=1` (from the dashboard's "Create a campaign") opens the creation form on arrival.
  const [searchParams, setSearchParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(() => searchParams.has('new'))
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

  // Drop the flag once consumed so a reload or Back does not reopen the form.
  useEffect(() => {
    if (searchParams.has('new')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

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
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {['Title', 'Games', 'Created by', 'Created', 'Updated'].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground"
                  >
                    {label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-3 py-2 align-middle">
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {campaign.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-middle whitespace-nowrap">{gamesLabel(campaign.game_count)}</td>
                  <td className="px-3 py-2 align-middle">{campaign.creator_name ?? 'Unknown member'}</td>
                  <td className="px-3 py-2 align-middle whitespace-nowrap">{formatDate(campaign.created_at)}</td>
                  <td className="px-3 py-2 align-middle whitespace-nowrap">{formatDate(campaign.updated_at)}</td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Edit ${campaign.title}`}
                        title="Edit"
                        onClick={() => openEdit(campaign)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Delete ${campaign.title}`}
                        title="Delete"
                        onClick={() => setDeleting(campaign)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
