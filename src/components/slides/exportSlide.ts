import { toBlob } from 'html-to-image'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/lib/slides'
import { waitUntil } from '@/lib/waitUntil'

/** Slides mark themselves with this attribute while a stored image is still downloading. */
export const SLIDE_LOADING_ATTR = 'data-slide-loading'
const LOADING_TIMEOUT_MS = 10_000

/** Waits for stored images to finish loading; on timeout it proceeds and exports whatever is shown. */
async function imagesLoaded(node: HTMLElement): Promise<void> {
  await waitUntil(() => !node.querySelector(`[${SLIDE_LOADING_ATTR}]`), LOADING_TIMEOUT_MS)
}

async function imagesDecoded(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'))
  // A broken image must not block the export; it simply renders as missing.
  await Promise.all(images.map((img) => img.decode().catch(() => undefined)))
}

/**
 * Renders an unscaled slide node (see SlideFrame's ref) to a 1080×1350 PNG.
 * The transform is reset on the clone, so even a scaled preview node exports at full size.
 */
export async function exportSlidePng(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  await imagesLoaded(node)
  await imagesDecoded(node)
  const blob = await toBlob(node, {
    pixelRatio: 1,
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    style: { transform: 'none' },
  })
  if (!blob) throw new Error('Could not render the slide')
  return blob
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
