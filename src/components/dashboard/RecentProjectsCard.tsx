import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toMessage } from '@/data/errors'
import { listProjects } from '@/data/projects'
import type { Project } from '@/data/types'

const RECENT_LIMIT = 5
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function gamesLabel(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`
}

export function RecentProjectsCard() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped by Retry to run the load effect again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // A response that arrives after a newer load started (or after unmount) is ignored.
    let current = true
    listProjects().then(
      (list) => {
        if (current) setProjects(list.slice(0, RECENT_LIMIT))
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
    setProjects(null)
    setAttempt((n) => n + 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent projects</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? (
          <div role="alert" className="grid justify-items-start gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={retry}>
              Retry
            </Button>
          </div>
        ) : projects === null ? (
          <p className="text-muted-foreground">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="grid justify-items-start gap-2">
            <p className="font-medium">No projects yet</p>
            <Link to="/projects" className={buttonVariants({ variant: 'outline' })}>
              Create a project
            </Link>
            <Link to="/projects" className="text-sm underline underline-offset-4">
              View all projects
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid gap-3">
              {projects.map((project) => (
                <li key={project.id} className="grid gap-1">
                  <Link
                    to={`/projects/${project.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {project.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {gamesLabel(project.game_count)} · Updated{' '}
                    {dateFormat.format(new Date(project.updated_at))}
                  </p>
                </li>
              ))}
            </ul>
            <Link to="/projects" className="text-sm underline underline-offset-4">
              View all projects
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
