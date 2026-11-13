import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { toMessage } from '@/data/errors'
import { createTemplate, deleteTemplate, listTemplates, reorderTemplates, updateTemplate } from '@/data/templates'
import type { CampaignTemplate, GameWithCampaigns, GamesVenue, TemplateConfig, TemplateType } from '@/data/types'
import { groupGamesByDay } from '@/lib/gameSlides'
import { buildSlides } from '@/lib/slides'
import { TEMPLATE_TYPE_LABELS, deleteTemplateDescription } from '@/lib/templates'
import { TemplateDialog } from './TemplateDialog'
import { SlidesPreview } from './SlidesPreview'
import { TemplateList } from './TemplateList'

const REORDER_CONFLICT = '22023'

function reorderErrorMessage(e: unknown): string {
  const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: string }).code : undefined
  return code === REORDER_CONFLICT ? 'Templates changed elsewhere; the list was refreshed.' : toMessage(e)
}

const TEMPLATE_TYPES: TemplateType[] = ['intro', 'focus', 'games']

type TemplatesSectionProps = {
  campaignId: string
  games: GameWithCampaigns[] | null
}

/** Campaign templates: list, add, edit, delete and reorder. */
export function TemplatesSection({ campaignId, games }: TemplatesSectionProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  // Kept after closing so the dialog does not change content during its close animation.
  const [editing, setEditing] = useState<CampaignTemplate | undefined>()
  const [addType, setAddType] = useState<TemplateType>('intro')
  const [deleting, setDeleting] = useState<CampaignTemplate | null>(null)
  // Kept after closing so the delete dialog keeps its text during its close animation.
  const [lastDeleted, setLastDeleted] = useState<CampaignTemplate | null>(null)
  // Reorders run one at a time so they reach the database in the order they were made.
  const reorderQueue = useRef<Promise<void>>(Promise.resolve())
  const pendingReorders = useRef(0)
  // Only the latest request may write state, so a slow older response cannot overwrite a newer one.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    try {
      const list = await listTemplates(campaignId)
      if (id !== requestId.current) return
      setTemplates(list)
      setError(null)
    } catch (e) {
      if (id === requestId.current) setError(toMessage(e))
    }
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  const gameCountByVenue = useMemo(() => {
    if (games === null) return null
    const count = (venue: GamesVenue) =>
      groupGamesByDay(games, venue).reduce((sum, day) => sum + day.games.length, 0)
    return { home: count('home'), away: count('away') }
  }, [games])

  const slides = useMemo(() => buildSlides(templates ?? [], games ?? []), [templates, games])

  function openAdd(type: TemplateType) {
    setEditing(undefined)
    setAddType(type)
    setDialogOpen(true)
  }

  function openEdit(template: CampaignTemplate) {
    setEditing(template)
    setDialogOpen(true)
  }

  async function handleSubmit(type: TemplateType, config: TemplateConfig) {
    if (editing) await updateTemplate(editing.id, config)
    else await createTemplate(campaignId, type, config)
    setDialogOpen(false)
    await load()
  }

  async function handleReorder(orderedIds: string[]) {
    if (!templates) return
    // Invalidate any in-flight load so it cannot overwrite the optimistic order.
    requestId.current++
    const byId = new Map(templates.map((t) => [t.id, t]))
    setTemplates(orderedIds.map((id) => byId.get(id)!))
    pendingReorders.current++
    const run = reorderQueue.current.then(async () => {
      let failure: string | null = null
      try {
        await reorderTemplates(campaignId, orderedIds)
      } catch (e) {
        failure = reorderErrorMessage(e)
      }
      pendingReorders.current--
      // Refresh once, after the last queued reorder settles; an earlier failure still reports below.
      if (failure !== null || pendingReorders.current === 0) await load()
      // load() clears the error on success; show why the order was reverted.
      if (failure !== null) setError(failure)
    })
    reorderQueue.current = run
    await run
  }

  return (
    <section className="grid gap-3" aria-labelledby="templates-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="templates-heading" className="text-lg font-semibold">
          Templates
        </h2>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Add template">
          <span className="text-sm text-muted-foreground">Add template</span>
          {TEMPLATE_TYPES.map((type) => (
            <Button key={type} variant="outline" onClick={() => openAdd(type)}>
              {TEMPLATE_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>
      {error && (
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-sm text-destructive">{error}</p>
          {templates === null && (
            <Button variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          )}
        </div>
      )}
      {templates === null ? (
        !error && <p className="text-muted-foreground">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground">No templates yet.</p>
      ) : (
        <TemplateList
          templates={templates}
          gameCountByVenue={gameCountByVenue}
          onReorder={(ids) => void handleReorder(ids)}
          onEdit={openEdit}
          onDelete={(t) => {
            setLastDeleted(t)
            setDeleting(t)
          }}
        />
      )}
      {templates !== null && <SlidesPreview slides={slides} notice={games === null ? 'Loading games…' : undefined} />}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editing}
        type={addType}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={lastDeleted ? `Delete this ${TEMPLATE_TYPE_LABELS[lastDeleted.type]} template?` : 'Delete template?'}
        description={lastDeleted ? deleteTemplateDescription(lastDeleted) : ''}
        confirmLabel="Delete template"
        onConfirm={async () => {
          if (!deleting) return
          await deleteTemplate(deleting.id)
          setDeleting(null)
          await load()
        }}
      />
    </section>
  )
}
