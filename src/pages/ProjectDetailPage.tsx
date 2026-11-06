import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ProjectForm } from '@/components/ProjectForm'
import { Button } from '@/components/ui/button'
import { toMessage } from '@/data/errors'
import { AddGameDialog } from '@/components/AddGameDialog'
import { GameActions } from '@/components/GameActions'
import { GameRow } from '@/components/GameRow'
import { listProjectGames } from '@/data/games'
import { deleteProject, getProject, updateProject } from '@/data/projects'
import type { GameWithProjects, Project } from '@/data/types'
import { deleteProjectDescription } from '@/lib/projects'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

type ProjectState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; project: Project }

/** Keyed by id so navigating between projects starts from a fresh loading state. */
export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  return <ProjectDetail key={projectId} projectId={projectId} />
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const [state, setState] = useState<ProjectState>({ status: 'loading' })
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  // Only the latest request may write state, so a slow older response cannot overwrite a newer one.
  const requestId = useRef(0)

  const loadProject = useCallback(async () => {
    const id = ++requestId.current
    try {
      const project = await getProject(projectId)
      if (id !== requestId.current) return
      setState(project ? { status: 'ready', project } : { status: 'not-found' })
    } catch (e) {
      if (id !== requestId.current) return
      setState({ status: 'error', message: toMessage(e) })
    }
  }, [projectId])

  const [games, setGames] = useState<GameWithProjects[] | null>(null)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const gamesRequestId = useRef(0)

  const loadGames = useCallback(async () => {
    const id = ++gamesRequestId.current
    setGamesError(null)
    try {
      const list = await listProjectGames(projectId)
      if (id === gamesRequestId.current) setGames(list)
    } catch (e) {
      if (id === gamesRequestId.current) setGamesError(toMessage(e))
    }
  }, [projectId])

  useEffect(() => {
    void loadProject()
    void loadGames()
  }, [loadProject, loadGames])

  /** Reload after any change; linking games also bumps the project's updated_at. */
  const refresh = useCallback(async () => {
    await Promise.all([loadProject(), loadGames()])
  }, [loadProject, loadGames])

  if (state.status === 'loading') return <p className="text-muted-foreground">Loading…</p>
  if (state.status === 'error') {
    return (
      <div role="alert" className="grid justify-items-start gap-2">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button variant="outline" onClick={() => void loadProject()}>
          Retry
        </Button>
      </div>
    )
  }
  if (state.status === 'not-found') {
    return (
      <div className="grid justify-items-start gap-2">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-muted-foreground">It may have been deleted.</p>
        <Link to="/projects" className="underline underline-offset-4">
          Back to projects
        </Link>
      </div>
    )
  }

  const { project } = state

  async function handleEdit(title: string) {
    await updateProject(project.id, title)
    setEditOpen(false)
    await refresh()
  }

  async function handleDelete() {
    await deleteProject(project.id)
    setDeleteOpen(false)
    navigate('/projects')
  }

  return (
    <div className="grid gap-4">
      <Link to="/projects" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Projects
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            {project.creator_name ?? 'Unknown'} · Created {dateFormat.format(new Date(project.created_at))}{' '}
            · Updated {dateFormat.format(new Date(project.updated_at))}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>
      <section className="grid gap-3" aria-labelledby="games-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="games-heading" className="text-lg font-semibold">
            Games
          </h2>
          <Button onClick={() => setAddOpen(true)}>Add game</Button>
        </div>
        {gamesError ? (
          <div role="alert" className="grid justify-items-start gap-2">
            <p className="text-sm text-destructive">{gamesError}</p>
            <Button variant="outline" onClick={() => void loadGames()}>
              Retry
            </Button>
          </div>
        ) : games === null ? (
          <p className="text-muted-foreground">Loading games…</p>
        ) : games.length === 0 ? (
          <p className="text-muted-foreground">No games in this project yet.</p>
        ) : (
          <ul className="grid gap-3">
            {games.map((game) => (
              <li key={game.id}>
                <GameRow
                  game={game}
                  actions={<GameActions game={game} projectId={project.id} onChanged={refresh} />}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <AddGameDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={project.id}
        projectGameIds={games?.map((g) => g.id) ?? []}
        onAdded={refresh}
      />
      <ProjectForm open={editOpen} onOpenChange={setEditOpen} initial={project} onSubmit={handleEdit} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${project.title}"?`}
        description={deleteProjectDescription(games?.length ?? project.game_count)}
        confirmLabel="Delete project"
        onConfirm={handleDelete}
      />
    </div>
  )
}
