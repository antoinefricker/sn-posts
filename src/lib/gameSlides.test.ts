import { describe, expect, it } from 'vitest'
import type { Game } from '../data/types'
import { groupGamesByDay, matchupSides, paginateDays, type DayGroup } from './gameSlides'

let seq = 0
function game(date: string, time: string, isHome = true): Game {
  seq += 1
  return {
    id: `g${seq}`,
    code: `C${seq}`,
    team_name: 'Us',
    opponent_name: 'Them',
    game_date: date,
    kickoff_time: time,
    is_home: isHome,
    score_ours: null,
    score_theirs: null,
    created_by: null,
    creator_name: null,
    created_at: '',
    updated_at: '',
  }
}

function day(date: string, count: number): DayGroup {
  return {
    date,
    games: Array.from({ length: count }, (_, i) => game(date, `${String(10 + i).padStart(2, '0')}:00:00`)),
  }
}

describe('groupGamesByDay', () => {
  it('keeps the venue, groups by date and sorts by kickoff', () => {
    const games = [
      game('2026-03-08', '15:00:00'),
      game('2026-03-07', '14:00:00'),
      game('2026-03-07', '10:00:00'),
      game('2026-03-07', '12:00:00', false),
    ]
    const days = groupGamesByDay(games, 'home')
    expect(days.map((d) => d.date)).toEqual(['2026-03-07', '2026-03-08'])
    expect(days[0].games.map((g) => g.kickoff_time)).toEqual(['10:00:00', '14:00:00'])
    expect(groupGamesByDay(games, 'away')).toHaveLength(1)
  })
  it('returns [] for empty input or no matching venue', () => {
    expect(groupGamesByDay([], 'home')).toEqual([])
    expect(groupGamesByDay([game('2026-03-07', '10:00:00', false)], 'home')).toEqual([])
  })
})

describe('paginateDays', () => {
  it('returns no slide for no days', () => {
    expect(paginateDays([], 8)).toEqual([])
  })
  it('fits 1, 2 and 2 games on one page at capacity 8', () => {
    const pages = paginateDays([day('2026-03-01', 1), day('2026-03-02', 2), day('2026-03-03', 2)], 8)
    expect(pages).toHaveLength(1)
  })
  it('splits a long day and repeats its date', () => {
    const pages = paginateDays([day('2026-03-01', 10)], 8)
    expect(pages).toHaveLength(2)
    expect(pages[0].days[0].games).toHaveLength(7)
    expect(pages[1].days[0].games).toHaveLength(3)
    expect(pages[1].days[0].date).toBe('2026-03-01')
  })
  it('never leaves a header alone at the bottom of a page', () => {
    const pages = paginateDays([day('2026-03-01', 6), day('2026-03-02', 2)], 8)
    expect(pages).toHaveLength(2)
    expect(pages[0].days.map((d) => d.date)).toEqual(['2026-03-01'])
    expect(pages[1].days.map((d) => d.date)).toEqual(['2026-03-02'])
  })
  it('splits the second day across pages when room remains for a game', () => {
    const pages = paginateDays([day('2026-03-01', 1), day('2026-03-02', 6)], 8)
    expect(pages).toHaveLength(2)
    expect(pages[0].days.map((d) => [d.date, d.games.length])).toEqual([
      ['2026-03-01', 1],
      ['2026-03-02', 5],
    ])
    expect(pages[1].days.map((d) => [d.date, d.games.length])).toEqual([['2026-03-02', 1]])
  })
  it('makes progress at capacity 2', () => {
    const pages = paginateDays([day('2026-03-01', 3)], 2)
    expect(pages).toHaveLength(3)
    expect(pages.every((p) => p.days.length === 1 && p.days[0].games.length === 1)).toBe(true)
  })
  it('throws below capacity 2', () => {
    expect(() => paginateDays([day('2026-03-01', 1)], 1)).toThrow(RangeError)
  })
  it('keeps every game once, in order', () => {
    const days = [day('2026-03-01', 4), day('2026-03-02', 9), day('2026-03-03', 3)]
    const expected = days.flatMap((d) => d.games.map((g) => g.id))
    const actual = paginateDays(days, 8).flatMap((p) => p.days.flatMap((d) => d.games.map((g) => g.id)))
    expect(actual).toEqual(expected)
  })
})

describe('matchupSides', () => {
  it('puts our team on the left at home', () => {
    expect(matchupSides(game('2026-11-14', '14:00:00', true), 'home')).toEqual({ left: 'Us', right: 'Them' })
  })

  it('puts the host (opponent) on the left away', () => {
    expect(matchupSides(game('2026-11-14', '14:00:00', false), 'away')).toEqual({ left: 'Them', right: 'Us' })
  })
})
