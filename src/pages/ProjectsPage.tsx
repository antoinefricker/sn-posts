import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { listProjects } from '@/data/projects'
import { toMessage } from '@/data/errors'
import type { Project } from '@/data/types'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function formatDate(value: string): string {
  return dateFormat.format(new Date(value))
}

function gamesLabel(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setProjects(await listProjects())
    } catch (e) {
      setError(toMessage(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Projects</h1>
      </div>
      {error ? (
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : projects === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground">No projects yet.</p>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Card>
                <CardContent className="grid gap-1">
                  <Link
                    to={`/projects/${project.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {project.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {project.creator_name ?? 'Unknown'} · Created {formatDate(project.created_at)} ·
                    Updated {formatDate(project.updated_at)} · {gamesLabel(project.game_count)}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
