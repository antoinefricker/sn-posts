import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { Link } from 'react-router'
import { CampaignLinks } from '@/components/CampaignLinks'
import { GamesTable } from '@/components/GamesTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toMessage } from '@/data/errors'
import { listGames } from '@/data/games'
import type { GameWithCampaigns } from '@/data/types'
import { lastGames } from '@/lib/upcoming'

const LAST_LIMIT = 5

export function LastGamesCard() {
  const [games, setGames] = useState<GameWithCampaigns[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped by Retry to run the load effect again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // A response that arrives after a newer load started (or after unmount) is ignored.
    let current = true
    listGames().then(
      (list) => {
        if (current) setGames(lastGames(list, new Date(), LAST_LIMIT))
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
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" aria-hidden />
          Last games
        </CardTitle>
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
            <p className="font-medium">No games played yet</p>
            <Link to="/games" className="text-sm underline underline-offset-4">
              View all games
            </Link>
          </div>
        ) : (
          <>
            <GamesTable games={games} campaigns={(game) => <CampaignLinks campaigns={game.campaigns} />} />
            <Link to="/games" className="text-sm underline underline-offset-4">
              View all games
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
