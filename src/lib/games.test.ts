import { describe, expect, it } from 'vitest'
import { deleteAllGamesDescription, deleteGameDescription, formatScore, normalizeGameCode } from './games'

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

describe('deleteAllGamesDescription', () => {
  it('states the count, the campaigns effect and that it cannot be undone', () => {
    expect(deleteAllGamesDescription(1, 0)).toBe(
      'Deletes the only game of the club for good. It is not used in any campaign. This cannot be undone.',
    )
    expect(deleteAllGamesDescription(93, 0)).toBe(
      'Deletes all 93 games of the club for good. None of them is used in a campaign. This cannot be undone.',
    )
    expect(deleteAllGamesDescription(93, 1)).toBe(
      'Deletes all 93 games of the club for good. 1 of them is used in a campaign and will be removed from it. This cannot be undone.',
    )
    expect(deleteAllGamesDescription(93, 12)).toBe(
      'Deletes all 93 games of the club for good. 12 of them are used in campaigns and will be removed from them. This cannot be undone.',
    )
  })
})

describe('normalizeGameCode', () => {
  it('trims', () => {
    expect(normalizeGameCode('  AB12 ')).toBe('AB12')
  })
})

describe('deleteGameDescription', () => {
  it('leads with the club-level effect and words 0, 1 and many campaigns', () => {
    expect(deleteGameDescription(0)).toBe(
      'Deletes the game from the club for good. It is not used in any campaign. This cannot be undone.',
    )
    expect(deleteGameDescription(1)).toBe(
      'Deletes the game from the club for good. It is used in 1 campaign and will be removed from it. This cannot be undone.',
    )
    expect(deleteGameDescription(3)).toBe(
      'Deletes the game from the club for good. It is used in 3 campaigns and will be removed from all of them. This cannot be undone.',
    )
  })
})
