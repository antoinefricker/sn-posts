import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CampaignForm } from '@/components/CampaignForm'
import { CampaignsTable } from '@/components/CampaignsTable'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Pagination } from '@/components/Pagination'
import { createCampaign, deleteCampaign, listCampaigns, updateCampaign } from '@/data/campaigns'
import { toMessage } from '@/data/errors'
import { deleteCampaignDescription } from '@/lib/campaigns'
import { paginate } from '@/lib/pagination'
import type { Campaign, CampaignInput } from '@/data/types'

const PAGE_SIZE = 20

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
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

  // paginate() clamps the page, so deleting the last campaign of a page never leaves an empty page.
  const page = useMemo(() => paginate(campaigns ?? [], pageNumber, PAGE_SIZE), [campaigns, pageNumber])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign)
    setFormOpen(true)
  }

  async function handleSubmit(input: CampaignInput) {
    if (editing) await updateCampaign(editing.id, input)
    else await createCampaign(input.title)
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
        <>
          <CampaignsTable
            campaigns={page.items}
            actions={(campaign) => (
              <>
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
              </>
            )}
          />
          <Pagination page={page} noun="campaigns" onPageChange={setPageNumber} />
        </>
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
