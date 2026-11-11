import { describe, expect, it } from 'vitest'
import { deleteAllGamesDescription, filterGamesByRange, deleteGameDescription, formatScore, normalizeGameCode } from './games'

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

describe('filterGamesByRange', () => {
  const at = (game_date: string, kickoff_time: string) => ({ game_date, kickoff_time })
  const games = [
    at('2026-10-05', '20:30:00'),
    at('2026-10-19', '20:30:00'),
    at('2026-11-07', '20:00:00'),
    at('2026-11-15', '09:00:00'),
  ]

  it('keeps everything when both bounds are empty', () => {
    expect(filterGamesByRange(games, '', '')).toEqual(games)
  })
  it('keeps games from the start on, the start being included', () => {
    expect(filterGamesByRange(games, '2026-11-07T20:00', '')).toEqual(games.slice(2))
    expect(filterGamesByRange(games, '2026-11-07T20:01', '')).toEqual(games.slice(3))
  })
  it('keeps games up to the end, the end being included to the minute', () => {
    expect(filterGamesByRange(games, '', '2026-10-19T20:30')).toEqual(games.slice(0, 2))
    expect(filterGamesByRange(games, '', '2026-10-19T20:29')).toEqual(games.slice(0, 1))
  })
  it('keeps games between a start and an end', () => {
    expect(filterGamesByRange(games, '2026-10-10T00:00', '2026-11-10T23:59')).toEqual(games.slice(1, 3))
  })
  it('returns nothing when the start is after the end', () => {
    expect(filterGamesByRange(games, '2026-12-01T00:00', '2026-01-01T00:00')).toEqual([])
  })
})
