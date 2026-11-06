import { supabase } from '@/supabase'
import { normalizeGameCode } from '@/lib/games'
import type { Game, GameInput, GameWithProjects } from './types'

type GameRow = Omit<Game, 'creator_name'> & {
  creator: { name: string | null } | null
}
type GameRowWithProjects = GameRow & {
  project_games: { projects: { id: string; title: string } | null }[]
  /** Only present on listProjectGames (inner-join filter); dropped on mapping. */
  link?: unknown
}

const GAME_COLUMNS =
  'id, created_by, code, team_name, opponent_name, game_date, kickoff_time, location, score_ours, score_theirs, created_at, updated_at, creator:profiles!created_by(name)'
const GAME_WITH_PROJECTS = `${GAME_COLUMNS}, project_games(projects(id, title))`

function toGame({ creator, ...row }: GameRow): Game {
  return { ...row, creator_name: creator?.name ?? null }
}

function toGameWithProjects({ project_games, link: _link, ...row }: GameRowWithProjects): GameWithProjects {
  return {
    ...toGame(row),
    projects: project_games.flatMap((link) => (link.projects ? [link.projects] : [])),
  }
}

function toPayload(input: GameInput): GameInput {
  return { ...input, code: normalizeGameCode(input.code) }
}

export async function listGames(): Promise<GameWithProjects[]> {
  const { data, error } = await supabase
    .from('games')
    .select(GAME_WITH_PROJECTS)
    .order('game_date', { ascending: false })
    .order('kickoff_time', { ascending: false })
    .overrideTypes<GameRowWithProjects[], { merge: false }>()
  if (error) throw error
  return data.map(toGameWithProjects)
}

export async function listProjectGames(projectId: string): Promise<GameWithProjects[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`${GAME_WITH_PROJECTS}, link:project_games!inner(project_id)`)
    .eq('link.project_id', projectId)
    .order('game_date', { ascending: false })
    .order('kickoff_time', { ascending: false })
    .overrideTypes<GameRowWithProjects[], { merge: false }>()
  if (error) throw error
  return data.map(toGameWithProjects)
}

/** Case-insensitive lookup after trimming; null when no game has this code. */
export async function findGameByCode(code: string): Promise<Game | null> {
  const wanted = normalizeGameCode(code).toLowerCase()
  if (!wanted) return null
  const pattern = wanted.replace(/[\\%_]/g, (c) => `\\${c}`)
  const { data, error } = await supabase
    .from('games')
    .select(GAME_COLUMNS)
    .ilike('code', pattern)
    .overrideTypes<GameRow[], { merge: false }>()
  if (error) throw error
  const match = data.find((row) => normalizeGameCode(row.code).toLowerCase() === wanted)
  return match ? toGame(match) : null
}

export async function createGame(input: GameInput): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert(toPayload(input))
    .select(GAME_COLUMNS)
    .single<GameRow>()
  if (error) throw error
  return toGame(data)
}

export async function updateGame(id: string, input: GameInput): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .update(toPayload(input))
    .eq('id', id)
    .select(GAME_COLUMNS)
    .single<GameRow>()
  if (error) throw error
  return toGame(data)
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) throw error
}

export async function addGameToProject(projectId: string, gameId: string): Promise<void> {
  const { error } = await supabase
    .from('project_games')
    .insert({ project_id: projectId, game_id: gameId })
  if (error) throw error
}

export async function removeGameFromProject(projectId: string, gameId: string): Promise<void> {
  const { error } = await supabase
    .from('project_games')
    .delete()
    .eq('project_id', projectId)
    .eq('game_id', gameId)
  if (error) throw error
}
