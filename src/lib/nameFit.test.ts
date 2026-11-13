import { describe, expect, it } from 'vitest'
import { estimateLines, fitFontSize } from './nameFit'

const SIZES = [62, 56, 50, 44, 38, 32, 26]
const opts = { letterSpacing: 2, lineHeight: 1.05, maxHeight: 125 }

describe('estimateLines', () => {
  it('counts one line for short text', () => {
    expect(estimateLines('AB', 300, 40)).toBe(1)
  })
  it('loses space to word wrap', () => {
    // Each word fills most of the column, so every word gets its own line.
    expect(estimateLines('AAAAAAAAAA AAAAAAAAAA AAAAAAAAAA', 300, 50, 0)).toBe(3)
  })
  it('counts a too-long word as broken', () => {
    expect(estimateLines('A'.repeat(40), 100, 40, 0)).toBeGreaterThan(2)
  })
  it('is 0 for empty text', () => {
    expect(estimateLines('  ', 100, 40)).toBe(0)
  })
})

describe('fitFontSize', () => {
  it.each([
    ['AS MULHOUSE MMM WWW MMM', 340],
    ['BC MOMMENHEIM WWW 2', 300],
  ])('keeps wide-letter name %s inside the row', (name, width) => {
    const size = fitFontSize(name, width, SIZES, opts)
    const lines = estimateLines(name, width, size, 2)
    expect(lines * size * 1.05).toBeLessThanOrEqual(125)
  })

  it('keeps short names large', () => {
    expect(fitFontSize('SNB', 340, SIZES, opts)).toBe(62)
  })

  it('falls back to the smallest size', () => {
    expect(fitFontSize('X'.repeat(200), 100, SIZES, opts)).toBe(26)
  })
})
