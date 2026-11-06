/** Wording of the project delete confirmation; games are never deleted with a project. */
export function deleteProjectDescription(count: number): string {
  const games =
    count === 0 ? 'It has no games.' : count === 1 ? 'Its 1 game stays.' : `Its ${count} games stay.`
  return `Deletes only the project and its links. ${games}`
}
