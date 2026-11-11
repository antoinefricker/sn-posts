import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Page } from '@/lib/pagination'

type PaginationProps = {
  page: Page<unknown>
  /** What the list holds, for the summary: "games". */
  noun: string
  onPageChange: (page: number) => void
}

/** "21–40 of 93 games" with Previous / Next. Renders nothing when everything fits on one page. */
export function Pagination({ page, noun, onPageChange }: PaginationProps) {
  if (page.pageCount <= 1) return null
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {page.from}–{page.to} of {page.total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page.page - 1)}
          disabled={page.page <= 1}
        >
          <ChevronLeft data-icon="inline-start" />
          Previous
        </Button>
        <span className="text-sm">
          Page {page.page} of {page.pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page.page + 1)}
          disabled={page.page >= page.pageCount}
        >
          Next
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </nav>
  )
}
