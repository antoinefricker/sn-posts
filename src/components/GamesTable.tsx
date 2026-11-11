import type { ReactNode } from 'react'
import type { Game } from '@/data/types'
import { formatGameWhen, formatScore } from '@/lib/games'

type GamesTableProps<T extends Game> = {
  games: T[]
  /** Renders the action buttons for a row. */
  actions?: (game: T) => ReactNode
  /** When set, adds a "Campaigns" column rendered by this function. */
  campaigns?: (game: T) => ReactNode
}

const headClass = 'px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap'
const cellClass = 'px-3 py-2 align-middle'

export function GamesTable<T extends Game>({ games, actions, campaigns }: GamesTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th scope="col" className={headClass}>
              Code
            </th>
            <th scope="col" className={headClass}>
              Team
            </th>
            <th scope="col" className={headClass}>
              Opponent
            </th>
            <th scope="col" className={headClass}>
              When
            </th>
            <th scope="col" className={headClass}>
              Venue
            </th>
            <th scope="col" className={headClass}>
              Score
            </th>
            {campaigns && (
              <th scope="col" className={headClass}>
                Campaigns
              </th>
            )}
            {actions && (
              <th scope="col" className={headClass}>
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {games.map((game) => (
            <tr key={game.id}>
              <td className={`${cellClass} font-medium`}>{game.code}</td>
              <td className={cellClass}>{game.team_name}</td>
              <td className={cellClass}>{game.opponent_name}</td>
              <td className={`${cellClass} whitespace-nowrap`}>{formatGameWhen(game)}</td>
              <td className={cellClass}>{game.is_home ? 'Home' : 'Away'}</td>
              <td className={cellClass}>{formatScore(game) ?? '—'}</td>
              {campaigns && <td className={cellClass}>{campaigns(game)}</td>}
              {actions && (
                <td className={cellClass}>
                  <div className="flex flex-wrap justify-end gap-2">{actions(game)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
