import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { Game } from '@/data/types'
import { formatScore, isHomeGame } from '@/lib/games'

const whenFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** 'YYYY-MM-DD' + 'HH:MM[:SS]' as local date and time in the user's locale. */
export function formatGameWhen(game: Pick<Game, 'game_date' | 'kickoff_time'>): string {
  const when = new Date(`${game.game_date}T${game.kickoff_time}`)
  return Number.isNaN(when.getTime()) ? `${game.game_date} ${game.kickoff_time}` : whenFormat.format(when)
}

type GameRowProps = {
  game: Game
  actions?: ReactNode
}

export function GameRow({ game, actions }: GameRowProps) {
  const score = formatScore(game)
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="font-medium">
            <span className="text-muted-foreground">{game.code}</span> · {game.team_name} vs{' '}
            {game.opponent_name}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatGameWhen(game)} · {isHomeGame(game) ? 'Home' : game.location} ·{' '}
            <span aria-label="Score">{score ?? '—'}</span> · {game.creator_name ?? 'Unknown'}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </CardContent>
    </Card>
  )
}
