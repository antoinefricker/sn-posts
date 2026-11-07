const DUPLICATE_CODE_MESSAGE = 'A game with this code already exists in your club'
const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

export function toMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { code, message, details } = error as {
      code?: unknown
      message?: unknown
      details?: unknown
    }
    if (
      code === '23505' &&
      [message, details].some((v) => typeof v === 'string' && v.includes('games_club_code_key'))
    ) {
      return DUPLICATE_CODE_MESSAGE
    }
    if (typeof message === 'string' && message) return message
  }
  if (typeof error === 'string' && error) return error
  return GENERIC_MESSAGE
}
