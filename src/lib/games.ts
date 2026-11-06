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

/** Confirmation text for deleting a game, stating how many projects lose it. */
export function deleteGameDescription(projectCount: number): string {
  const where =
    projectCount === 0
      ? 'It is not used in any project.'
      : projectCount === 1
        ? 'Deletes the game from 1 project.'
        : `Deletes the game from ${projectCount} projects.`
  return `${where} This cannot be undone.`
}
