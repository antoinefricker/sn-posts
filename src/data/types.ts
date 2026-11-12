export type CampaignStatus = 'active' | 'closed'

export type CampaignInput = {
  title: string
  status: CampaignStatus
}

export type Campaign = {
  id: string
  title: string
  status: CampaignStatus
  created_at: string
  updated_at: string
  created_by: string | null
  creator_name: string | null
  game_count: number
}

export type GameInput = {
  code: string
  team_name: string
  opponent_name: string
  game_date: string
  kickoff_time: string
  is_home: boolean
  score_ours: number | null
  score_theirs: number | null
}

export type Game = GameInput & {
  id: string
  created_by: string | null
  creator_name: string | null
  created_at: string
  updated_at: string
}

export type GameWithCampaigns = Game & {
  campaigns: { id: string; title: string }[]
}
