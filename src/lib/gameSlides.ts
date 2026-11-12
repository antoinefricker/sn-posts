import type { Game, GamesVenue } from '../data/types'

/** Rows per games slide; a day header counts as one row. */
export const GAMES_SLIDE_ROW_CAPACITY = 8

export type DayGroup = { date: string; games: Game[] }

/** A continued day appears again, with the same date, at the top of the next page. */
export type GamesPage = { days: DayGroup[] }

/** Games of one venue grouped by day. Dates and times are plain strings, compared lexicographically to avoid timezone shifts. */
export function groupGamesByDay(games: Game[], venue: GamesVenue): DayGroup[] {
  const wantHome = venue === 'home'
  const byDate = new Map<string, Game[]>()
  for (const g of games) {
    if (g.is_home !== wantHome) continue
    const list = byDate.get(g.game_date)
    if (list) list.push(g)
    else byDate.set(g.game_date, [g])
  }
  return [...byDate.keys()]
    .sort()
    .map((date) => ({
      date,
      games: byDate.get(date)!.slice().sort((a, b) => (a.kickoff_time < b.kickoff_time ? -1 : a.kickoff_time > b.kickoff_time ? 1 : 0)),
    }))
}

/** Splits days onto slides. A day needs its header plus at least one game on a page, otherwise it starts the next one. */
export function paginateDays(days: DayGroup[], capacity: number = GAMES_SLIDE_ROW_CAPACITY): GamesPage[] {
  if (capacity < 2) throw new RangeError('capacity must be at least 2')
  const pages: GamesPage[] = []
  let current: DayGroup[] = []
  let left = capacity
  const flush = () => {
    if (current.length > 0) pages.push({ days: current })
    current = []
    left = capacity
  }
  for (const d of days) {
    let rest = d.games
    while (rest.length > 0) {
      if (left < 2) flush()
      const take = Math.min(rest.length, left - 1)
      current.push({ date: d.date, games: rest.slice(0, take) })
      left -= take + 1
      rest = rest.slice(take)
    }
  }
  flush()
  return pages
}

/** The host team goes on the left, as on the club's posts: our team at home, the opponent away. */
export function matchupSides(game: Game, venue: GamesVenue): { left: string; right: string } {
  return venue === 'home'
    ? { left: game.team_name, right: game.opponent_name }
    : { left: game.opponent_name, right: game.team_name }
}
