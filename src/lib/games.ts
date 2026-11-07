export function normalizeGameCode(code: string): string {
  return code.trim()
}

/** A game without a location is a home game. */
export function isHomeGame(game: { location: string | null }): boolean {
  return !game.location || game.location.trim() === ''
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
