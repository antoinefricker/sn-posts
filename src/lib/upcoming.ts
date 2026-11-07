// Parse 'YYYY-MM-DD' + 'HH:MM[:SS]' as local (browser) time, never UTC.
function toLocalDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, ss || 0)
}

export function upcomingGames<T extends { game_date: string; kickoff_time: string }>(
  games: T[],
  now: Date,
  limit: number,
): T[] {
  return games
    .map((game) => ({ game, at: toLocalDate(game.game_date, game.kickoff_time).getTime() }))
    .filter(({ at }) => at >= now.getTime())
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map(({ game }) => game)
}
