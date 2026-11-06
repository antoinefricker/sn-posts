import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { GameRow } from '@/components/GameRow'
import { Button } from '@/components/ui/button'
import { toMessage } from '@/data/errors'
import { listGames } from '@/data/games'
import type { GameWithProjects } from '@/data/types'

function ProjectLinks({ projects }: { projects: GameWithProjects['projects'] }) {
  if (projects.length === 0) {
    return <p className="px-1 text-sm text-muted-foreground">Not used in any project</p>
  }
  return (
    <p className="px-1 text-sm text-muted-foreground">
      In:{' '}
      {projects.map((project, i) => (
        <span key={project.id}>
          {i > 0 && ', '}
          <Link to={`/projects/${project.id}`} className="underline underline-offset-4">
            {project.title}
          </Link>
        </span>
      ))}
    </p>
  )
}

export function GamesPage() {
  const [games, setGames] = useState<GameWithProjects[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Only the latest request may write state, so a slow older response cannot overwrite a newer one.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setError(null)
    try {
      const list = await listGames()
      if (id === requestId.current) setGames(list)
    } catch (e) {
      if (id === requestId.current) setError(toMessage(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Games</h1>
      {error ? (
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : games === null ? (
        <p className="text-muted-foreground">Loading games…</p>
      ) : games.length === 0 ? (
        <div className="grid gap-1">
          <p className="font-medium">No games yet</p>
          <p className="text-sm text-muted-foreground">Games are added from a project page.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {games.map((game) => (
            <li key={game.id} className="grid gap-1">
              <GameRow game={game} />
              <ProjectLinks projects={game.projects} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
