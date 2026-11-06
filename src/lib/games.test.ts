import { describe, expect, it } from 'vitest'
import { deleteGameDescription, formatScore, isHomeGame, normalizeGameCode } from './games'

describe('formatScore', () => {
  it('formats a score', () => {
    expect(formatScore({ score_ours: 2, score_theirs: 1 })).toBe('2 - 1')
  })
  it('keeps zeros', () => {
    expect(formatScore({ score_ours: 0, score_theirs: 0 })).toBe('0 - 0')
  })
  it('returns null when unset', () => {
    expect(formatScore({ score_ours: null, score_theirs: null })).toBeNull()
  })
})

describe('isHomeGame', () => {
  it('is home when location is null, empty or whitespace', () => {
    expect(isHomeGame({ location: null })).toBe(true)
    expect(isHomeGame({ location: '' })).toBe(true)
    expect(isHomeGame({ location: '  ' })).toBe(true)
  })
  it('is away when a location is set', () => {
    expect(isHomeGame({ location: 'Stade' })).toBe(false)
  })
})

describe('normalizeGameCode', () => {
  it('trims', () => {
    expect(normalizeGameCode('  AB12 ')).toBe('AB12')
  })
})

describe('deleteGameDescription', () => {
  it('words 0, 1 and many projects', () => {
    expect(deleteGameDescription(0)).toContain('It is not used in any project.')
    expect(deleteGameDescription(1)).toContain('Deletes the game from 1 project.')
    expect(deleteGameDescription(3)).toContain('Deletes the game from 3 projects.')
  })
})
