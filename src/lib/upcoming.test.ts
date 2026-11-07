import { describe, expect, it } from 'vitest'
import { upcomingGames } from './upcoming'

const g = (game_date: string, kickoff_time: string, id = '') => ({
  game_date,
  kickoff_time,
  id,
})

// Local-time constructed "now", independent of the machine timezone.
const now = new Date(2026, 10, 6, 14, 0)

describe('upcomingGames', () => {
  it('excludes a game today whose kick-off already passed', () => {
    expect(upcomingGames([g('2026-11-06', '10:00:00')], now, 5)).toEqual([])
  })

  it('includes a game at exactly now', () => {
    const games = [g('2026-11-06', '14:00:00')]
    expect(upcomingGames(games, now, 5)).toEqual(games)
  })

  it('includes tomorrow 08:00', () => {
    const games = [g('2026-11-07', '08:00:00')]
    expect(upcomingGames(games, now, 5)).toEqual(games)
  })

  it('parses HH:MM kickoff times', () => {
    const games = [g('2026-11-06', '14:00'), g('2026-11-06', '13:59')]
    expect(upcomingGames(games, now, 5)).toEqual([games[0]])
  })

  it('parses dates as local time, not UTC', () => {
    const late = new Date(2026, 5, 15, 23, 30)
    const games = [g('2026-06-15', '23:45:00'), g('2026-06-15', '23:15:00')]
    expect(upcomingGames(games, late, 5)).toEqual([games[0]])
  })

  it('sorts unsorted input soonest first without mutating it', () => {
    const a = g('2026-11-09', '09:00:00', 'a')
    const b = g('2026-11-06', '18:00:00', 'b')
    const c = g('2026-11-07', '08:00:00', 'c')
    const input = [a, b, c]
    expect(upcomingGames(input, now, 5).map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(input).toEqual([a, b, c])
  })

  it('keeps input order for ties', () => {
    const a = g('2026-11-07', '08:00:00', 'a')
    const b = g('2026-11-07', '08:00:00', 'b')
    expect(upcomingGames([a, b], now, 5).map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('respects the limit', () => {
    const games = [
      g('2026-11-07', '08:00:00'),
      g('2026-11-08', '08:00:00'),
      g('2026-11-09', '08:00:00'),
    ]
    expect(upcomingGames(games, now, 2)).toEqual(games.slice(0, 2))
  })

  it('returns [] for empty input', () => {
    expect(upcomingGames([], now, 3)).toEqual([])
  })
})
