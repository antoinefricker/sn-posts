import { estimateLines, fitFontSize } from './nameFit'

const SLIDE_WIDTH = 1080
const SLIDE_HEIGHT = 1350
export const INTRO_PADDING = 90
export const INTRO_GAP = 40
export const INTRO_TITLE_LINE_HEIGHT = 1.05
const TEXT_WIDTH = SLIDE_WIDTH - 2 * INTRO_PADDING
const TITLE_SIZES = [150, 130, 115, 100, 90, 80, 70]
const SUBTITLE_SIZE = 64
const SUBTITLE_LINE_HEIGHT = 1.15
const MARGIN = 60

/** Height of the subtitle block including the gap above it; 0 without a subtitle. */
export function introSubtitleHeight(subtitle: string): number {
  if (!subtitle.trim()) return 0
  return estimateLines(subtitle, TEXT_WIDTH, SUBTITLE_SIZE) * SUBTITLE_SIZE * SUBTITLE_LINE_HEIGHT + INTRO_GAP
}

/** Title font size, stepped down past 4 lines so title and subtitle fit inside the padding with a margin. */
export function introTitleSize(title: string, subtitle: string): number {
  const available = SLIDE_HEIGHT - 2 * INTRO_PADDING - introSubtitleHeight(subtitle) - MARGIN
  return fitFontSize(title, TEXT_WIDTH, TITLE_SIZES, { lineHeight: INTRO_TITLE_LINE_HEIGHT, maxHeight: available, maxLines: 4 })
}
