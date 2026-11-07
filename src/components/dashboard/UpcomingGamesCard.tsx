import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatGameWhen } from '@/components/GameRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toMessage } from '@/data/errors'
import { listGames } from '@/data/games'
import type { GameWithCampaigns } from '@/data/types'
import { isHomeGame } from '@/lib/games'
import { upcomingGames } from '@/lib/upcoming'

const UPCOMING_LIMIT = 5

export function UpcomingGamesCard() {
  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped by Retry to run the load effect again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // A response that arrives after a newer load started (or after unmount) is ignored.
    let current = true
    listGames().then(
      (list) => {
        if (current) setGames(upcomingGames(list, new Date(), UPCOMING_LIMIT))
      },
      (e) => {
        if (current) setError(toMessage(e))
      },
    )
    return () => {
      current = false
    }
  }, [attempt])

  function retry() {
    setError(null)
    setGames(null)
    setAttempt((n) => n + 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming games</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? (
          <div role="alert" className="grid justify-items-start gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={retry}>
              Retry
            </Button>
          </div>
        ) : games === null ? (
          <p className="text-muted-foreground">Loading games…</p>
        ) : games.length === 0 ? (
          <div className="grid justify-items-start gap-2">
            <p className="font-medium">No upcoming games</p>
            <Link to="/games" className="text-sm underline underline-offset-4">
              View all games
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid gap-3">
              {games.map((game) => (
                <li key={game.id} className="grid gap-1">
                  <p className="font-medium">
                    {game.team_name} vs {game.opponent_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatGameWhen(game)} · {isHomeGame(game) ? 'Home' : game.location}
                  </p>
                  {game.campaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not used in any campaign</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      In:{' '}
                      {game.campaigns.map((campaign, i) => (
                        <span key={campaign.id}>
                          {i > 0 && ', '}
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="underline underline-offset-4"
                          >
                            {campaign.title}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <Link to="/games" className="text-sm underline underline-offset-4">
              View all games
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
