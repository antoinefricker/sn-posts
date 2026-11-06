import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectForm } from '@/components/ProjectForm'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { createProject, deleteProject, listProjects, updateProject } from '@/data/projects'
import { toMessage } from '@/data/errors'
import { deleteProjectDescription } from '@/lib/projects'
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
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [editing, setEditing] = useState<Project | undefined>(undefined)

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

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(project: Project) {
    setEditing(project)
    setFormOpen(true)
  }

  async function handleSubmit(title: string) {
    if (editing) await updateProject(editing.id, title)
    else await createProject(title)
    setFormOpen(false)
    await load()
  }

  async function handleDelete() {
    if (!deleting) return
    await deleteProject(deleting.id)
    setDeleting(null)
    await load()
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={openCreate}>New project</Button>
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
        <p className="text-muted-foreground">No projects yet. Create the first one.</p>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="grid gap-1">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {project.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {project.creator_name ?? 'Unknown'} · Created {formatDate(project.created_at)}{' '}
                      · Updated {formatDate(project.updated_at)} · {gamesLabel(project.game_count)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(project)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleting(project)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={`Delete "${deleting?.title ?? ''}"?`}
        description={deleteProjectDescription(deleting?.game_count ?? 0)}
        confirmLabel="Delete project"
        onConfirm={handleDelete}
      />
    </div>
  )
}
