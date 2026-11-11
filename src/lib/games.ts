export function normalizeGameCode(code: string): string {
  return code.trim()
}

/** "2 - 1", or null when no score has been entered. */
export function formatScore(game: {
  score_ours: number | null
  score_theirs: number | null
}): string | null {
  if (game.score_ours === null || game.score_theirs === null) return null
  return `${game.score_ours} - ${game.score_theirs}`
}

/** Confirmation text for deleting a game: the club-level effect, then how many campaigns use it. */
export function deleteGameDescription(campaignCount: number): string {
  const usage =
    campaignCount === 0
      ? 'It is not used in any campaign.'
      : campaignCount === 1
        ? 'It is used in 1 campaign and will be removed from it.'
        : `It is used in ${campaignCount} campaigns and will be removed from all of them.`
  return `Deletes the game from the club for good. ${usage} This cannot be undone.`
}

/** Confirmation text for deleting every game of the club; `linked` is how many are in a campaign. */
export function deleteAllGamesDescription(total: number, linked: number): string {
  if (total === 1) {
    const usage = linked === 0 ? 'It is not used in any campaign.' : 'It is used in a campaign and will be removed from it.'
    return `Deletes the only game of the club for good. ${usage} This cannot be undone.`
  }
  const usage =
    linked === 0
      ? 'None of them is used in a campaign.'
      : linked === 1
        ? '1 of them is used in a campaign and will be removed from it.'
        : `${linked} of them are used in campaigns and will be removed from them.`
  return `Deletes all ${total} games of the club for good. ${usage} This cannot be undone.`
}

const whenFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 'YYYY-MM-DD' + 'HH:MM[:SS]' as 'DD/MM/YYYY HH:MM'. */
export function formatGameWhen(game: { game_date: string; kickoff_time: string }): string {
  const when = new Date(`${game.game_date}T${game.kickoff_time}`)
  return Number.isNaN(when.getTime())
    ? `${game.game_date} ${game.kickoff_time}`
    : whenFormat.format(when).replace(', ', ' ')
}
