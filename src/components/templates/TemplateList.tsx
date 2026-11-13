import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CampaignTemplate, GamesVenue } from '@/data/types'
import { TEMPLATE_TYPE_LABELS, reorderIds, templateSummary } from '@/lib/templates'

type TemplateListProps = {
  templates: CampaignTemplate[]
  gameCountByVenue: Record<GamesVenue, number>
  /** Called with the full new order after a drop. */
  onReorder: (orderedIds: string[]) => void
  onEdit: (template: CampaignTemplate) => void
  onDelete: (template: CampaignTemplate) => void
}

/** Sortable list of templates; drag by the handle (pointer or keyboard). */
export function TemplateList({ templates, gameCountByVenue, onReorder, onEdit, onDelete }: TemplateListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = templates.map((t) => t.id)

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const next = reorderIds(ids, String(active.id), String(over.id))
    if (next !== ids) onReorder(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="grid gap-2">
          {templates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              summary={templateSummary(t, gameCountByVenue)}
              onEdit={() => onEdit(t)}
              onDelete={() => onDelete(t)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function TemplateRow({
  template,
  summary,
  onEdit,
  onDelete,
}: {
  template: CampaignTemplate
  summary: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: template.id,
  })
  const label = TEMPLATE_TYPE_LABELS[template.type]
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-background p-2 ${isDragging ? 'relative z-10 shadow-md' : ''}`}
    >
      <Button
        ref={setActivatorNodeRef}
        variant="ghost"
        size="icon"
        className="cursor-grab touch-none"
        aria-label={`Reorder ${label} template`}
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>
      <span className="w-14 shrink-0 text-sm font-medium">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{summary}</span>
      <Button variant="outline" size="icon" aria-label={`Edit ${label} template`} onClick={onEdit}>
        <Pencil />
      </Button>
      <Button variant="outline" size="icon" aria-label={`Delete ${label} template`} onClick={onDelete}>
        <Trash2 />
      </Button>
    </li>
  )
}
