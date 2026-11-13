import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadBlob, exportSlidePng } from '@/components/slides/exportSlide'
import { SlideView } from '@/components/slides/SlideView'
import { toMessage } from '@/data/errors'
import type { Slide } from '@/lib/slides'

const THUMBNAIL_SCALE = 0.3
// Browsers drop downloads fired back to back; a short pause keeps them all.
const DOWNLOAD_GAP_MS = 400

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Scaled thumbnails of every slide with per-slide and "Download all" PNG export (1080×1350). */
export function SlidesPreview({ slides }: { slides: Slide[] }) {
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const busy = progress !== null || busyKey !== null

  /** Returns whether the slide was exported; records the failure against the slide otherwise. */
  async function exportOne(slide: Slide): Promise<boolean> {
    const node = nodes.current.get(slide.key)
    try {
      if (!node) throw new Error('Slide is not rendered')
      downloadBlob(await exportSlidePng(node), slide.fileName)
      setErrors((prev) => {
        if (!(slide.key in prev)) return prev
        const { [slide.key]: _removed, ...rest } = prev
        return rest
      })
      return true
    } catch (e) {
      setErrors((prev) => ({ ...prev, [slide.key]: `Could not export ${slide.fileName}: ${toMessage(e)}` }))
      return false
    }
  }

  async function downloadOne(slide: Slide) {
    setBusyKey(slide.key)
    await exportOne(slide)
    setBusyKey(null)
  }

  async function downloadAll() {
    setProgress({ done: 0, total: slides.length })
    for (const [i, slide] of slides.entries()) {
      setProgress({ done: i, total: slides.length })
      await exportOne(slide)
      if (i < slides.length - 1) await sleep(DOWNLOAD_GAP_MS)
    }
    setProgress(null)
  }

  if (slides.length === 0) return <p className="text-muted-foreground">Nothing to preview yet.</p>

  return (
    <section className="grid gap-3" aria-labelledby="slides-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="slides-heading" className="text-lg font-semibold">
          Slides
        </h2>
        <div className="flex items-center gap-3">
          {progress && (
            <span role="status" className="text-sm text-muted-foreground">
              Exporting {progress.done + 1} of {progress.total}…
            </span>
          )}
          <Button onClick={() => void downloadAll()} disabled={busy}>
            Download all
          </Button>
        </div>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
        {slides.map((slide) => (
          <li key={slide.key} className="grid justify-items-start gap-2">
            <div className="overflow-hidden rounded-md border">
              <SlideView
                slide={slide}
                scale={THUMBNAIL_SCALE}
                ref={(node) => {
                  if (node) nodes.current.set(slide.key, node)
                  else nodes.current.delete(slide.key)
                }}
              />
            </div>
            <div className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-sm">{slide.fileName}</span>
              <Button variant="outline" size="sm" onClick={() => void downloadOne(slide)} disabled={busy}>
                {busyKey === slide.key ? 'Exporting…' : 'Download'}
              </Button>
            </div>
            {errors[slide.key] && (
              <p role="alert" className="text-sm text-destructive">
                {errors[slide.key]} Use Download to retry.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
