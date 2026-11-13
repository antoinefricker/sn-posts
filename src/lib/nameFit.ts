// Anton is condensed: capitals average under half an em, M and W are noticeably wider. Widths are
// deliberately conservative so the estimate never says "fits" when the browser would wrap further.
const WIDE_CHARS = /[MW]/
const NARROW_EM = 0.5
const WIDE_EM = 0.65
const SPACE_EM = 0.3

function charWidth(ch: string, size: number, letterSpacing: number): number {
  if (ch === ' ') return size * SPACE_EM + letterSpacing
  return size * (WIDE_CHARS.test(ch) ? WIDE_EM : NARROW_EM) + letterSpacing
}

function wordWidth(word: string, size: number, letterSpacing: number): number {
  let w = 0
  for (const ch of word) w += charWidth(ch, size, letterSpacing)
  return w
}

/**
 * Lines `text` takes in a column `width` px wide at `size` px: greedy word wrap, the way a browser breaks
 * at spaces. A word wider than the column is counted as broken across as many lines as it needs.
 */
export function estimateLines(text: string, width: number, size: number, letterSpacing = 0): number {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const space = charWidth(' ', size, letterSpacing)
  let lines = 1
  let used = 0
  for (const word of words) {
    const w = wordWidth(word, size, letterSpacing)
    if (used === 0) {
      used = w
    } else if (used + space + w <= width) {
      used += space + w
    } else {
      lines++
      used = w
    }
    if (w > width) {
      lines += Math.ceil(w / width) - 1
      used = w % width
    }
  }
  return lines
}

/** True when no single word is wider than the column at this size (so no word would be split). */
export function wordsFit(text: string, width: number, size: number, letterSpacing = 0): boolean {
  return text.split(/\s+/).every((word) => wordWidth(word, size, letterSpacing) <= width)
}

export type FitOptions = { letterSpacing?: number; lineHeight: number; maxHeight: number; maxLines?: number; minSize?: number }

/** Largest of `sizes` (descending) whose wrapped text fits the limits without splitting a word; the smallest size otherwise. */
export function fitFontSize(text: string, width: number, sizes: number[], opts: FitOptions): number {
  const { letterSpacing = 0, lineHeight, maxHeight, maxLines = Infinity, minSize = 0 } = opts
  const found = sizes.find((size) => {
    if (size < minSize || !wordsFit(text, width, size, letterSpacing)) return false
    const lines = estimateLines(text, width, size, letterSpacing)
    return lines <= maxLines && lines * size * lineHeight <= maxHeight
  })
  return found ?? sizes[sizes.length - 1]
}
