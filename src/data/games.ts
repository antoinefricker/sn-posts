import { supabase } from '@/supabase'
import { normalizeGameCode } from '@/lib/games'
import type { Game, GameInput, GameWithCampaigns } from './types'

type GameRow = Omit<Game, 'creator_name'> & {
  creator: { name: string | null } | null
}
type GameRowWithCampaigns = GameRow & {
  campaign_games: { campaigns: { id: string; title: string } | null }[]
  /** Only present on listCampaignGames (inner-join filter); dropped on mapping. */
  link?: unknown
}

const GAME_COLUMNS =
  'id, created_by, code, team_name, opponent_name, game_date, kickoff_time, location, score_ours, score_theirs, created_at, updated_at, creator:profiles!created_by(name)'
const GAME_WITH_CAMPAIGNS = `${GAME_COLUMNS}, campaign_games(campaigns(id, title))`

function toGame({ creator, ...row }: GameRow): Game {
  return { ...row, creator_name: creator?.name ?? null }
}

function toGameWithCampaigns({ campaign_games, link: _link, ...row }: GameRowWithCampaigns): GameWithCampaigns {
  return {
    ...toGame(row),
    campaigns: campaign_games.flatMap((link) => (link.campaigns ? [link.campaigns] : [])),
  }
}

/** Picks exactly the GameInput columns, so a full Game passed by mistake never sends id/created_by. */
function toPayload(input: GameInput): GameInput {
  return {
    code: normalizeGameCode(input.code),
    team_name: input.team_name,
    opponent_name: input.opponent_name,
    game_date: input.game_date,
    kickoff_time: input.kickoff_time,
    location: input.location,
    score_ours: input.score_ours,
    score_theirs: input.score_theirs,
  }
}

export async function listGames(): Promise<GameWithCampaigns[]> {
  const { data, error } = await supabase
    .from('games')
    .select(GAME_WITH_CAMPAIGNS)
    .order('game_date', { ascending: false })
    .order('kickoff_time', { ascending: false })
    .overrideTypes<GameRowWithCampaigns[], { merge: false }>()
  if (error) throw error
  return data.map(toGameWithCampaigns)
}

export async function listCampaignGames(campaignId: string): Promise<GameWithCampaigns[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`${GAME_WITH_CAMPAIGNS}, link:campaign_games!inner(campaign_id)`)
    .eq('link.campaign_id', campaignId)
    .order('game_date', { ascending: false })
    .order('kickoff_time', { ascending: false })
    .overrideTypes<GameRowWithCampaigns[], { merge: false }>()
  if (error) throw error
  return data.map(toGameWithCampaigns)
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

export async function addGameToCampaign(campaignId: string, gameId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_games')
    .insert({ campaign_id: campaignId, game_id: gameId })
  if (error) throw error
}

export async function removeGameFromCampaign(campaignId: string, gameId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_games')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('game_id', gameId)
  if (error) throw error
}
