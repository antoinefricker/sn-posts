import { supabase } from '@/supabase'
import type { Project } from './types'

type ProjectRow = Omit<Project, 'creator_name' | 'game_count'> & {
  creator: { name: string | null } | null
  project_games: { count: number }[]
}

const PROJECT_COLUMNS =
  'id, created_by, title, created_at, updated_at, creator:profiles!created_by(name), project_games(count)'

function toProject({ creator, project_games, ...row }: ProjectRow): Project {
  return { ...row, creator_name: creator?.name ?? null, game_count: project_games[0]?.count ?? 0 }
}

function requireTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Title is required')
  return trimmed
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .order('updated_at', { ascending: false })
    .overrideTypes<ProjectRow[], { merge: false }>()
  if (error) throw error
  return data.map(toProject)
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('id', id)
    .maybeSingle<ProjectRow>()
  if (error) throw error
  return data ? toProject(data) : null
}

export async function createProject(title: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ title: requireTitle(title) })
    .select(PROJECT_COLUMNS)
    .single<ProjectRow>()
  if (error) throw error
  return toProject(data)
}

export async function updateProject(id: string, title: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ title: requireTitle(title) })
    .eq('id', id)
    .select(PROJECT_COLUMNS)
    .single<ProjectRow>()
  if (error) throw error
  return toProject(data)
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
