import { supabase } from '@/supabase'
import type { Campaign } from './types'

type CampaignRow = Omit<Campaign, 'creator_name' | 'game_count'> & {
  creator: { name: string | null } | null
  campaign_games: { count: number }[]
}

const CAMPAIGN_COLUMNS =
  'id, created_by, title, created_at, updated_at, creator:profiles!created_by(name), campaign_games(count)'

function toCampaign({ creator, campaign_games, ...row }: CampaignRow): Campaign {
  return { ...row, creator_name: creator?.name ?? null, game_count: campaign_games[0]?.count ?? 0 }
}

function requireTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Title is required')
  return trimmed
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_COLUMNS)
    .order('updated_at', { ascending: false })
    .overrideTypes<CampaignRow[], { merge: false }>()
  if (error) throw error
  return data.map(toCampaign)
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_COLUMNS)
    .eq('id', id)
    .maybeSingle<CampaignRow>()
  if (error) throw error
  return data ? toCampaign(data) : null
}

export async function createCampaign(title: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ title: requireTitle(title) })
    .select(CAMPAIGN_COLUMNS)
    .single<CampaignRow>()
  if (error) throw error
  return toCampaign(data)
}

export async function updateCampaign(id: string, title: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ title: requireTitle(title) })
    .eq('id', id)
    .select(CAMPAIGN_COLUMNS)
    .single<CampaignRow>()
  if (error) throw error
  return toCampaign(data)
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) throw error
}
