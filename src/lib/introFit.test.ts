import { describe, expect, it } from 'vitest'
import { INTRO_GAP, INTRO_PADDING, INTRO_TITLE_LINE_HEIGHT, introSubtitleHeight, introTitleSize } from './introFit'
import { estimateLines } from './nameFit'

describe('introTitleSize', () => {
  it('keeps a short title at full size', () => {
    expect(introTitleSize('CAMPAGNE', 'SAISON 2026')).toBe(150)
  })

  it('steps down a max-length title with a max-length subtitle so everything fits', () => {
    const title = 'MMMMM WWWWW '.repeat(5).slice(0, 60)
    const subtitle = 'W'.repeat(9) + (' ' + 'M'.repeat(9)).repeat(9)
    const size = introTitleSize(title, subtitle.slice(0, 100))
    expect(size).toBeLessThan(150)
    const lines = estimateLines(title, 900, size)
    expect(lines).toBeLessThanOrEqual(4)
    const total = lines * size * INTRO_TITLE_LINE_HEIGHT + introSubtitleHeight(subtitle.slice(0, 100))
    expect(total).toBeLessThanOrEqual(1350 - 2 * INTRO_PADDING)
  })

  it('has no subtitle height without a subtitle', () => {
    expect(introSubtitleHeight('')).toBe(0)
    expect(introSubtitleHeight('X')).toBeGreaterThan(INTRO_GAP)
  })
})
