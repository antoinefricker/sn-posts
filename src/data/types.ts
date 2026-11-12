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

export type TemplateType = 'intro' | 'focus' | 'games'

export type GamesVenue = 'home' | 'away'

export type IntroConfig = { background_path: string | null; title: string; subtitle: string }

export type FocusConfig = { badge: string; title: string; image_path: string | null }

export type GamesConfig = { venue: GamesVenue }

type CampaignTemplateBase = {
  id: string
  campaign_id: string
  position: number
  created_at: string
  updated_at: string
}

export type CampaignTemplate = CampaignTemplateBase &
  (
    | { type: 'intro'; config: IntroConfig }
    | { type: 'focus'; config: FocusConfig }
    | { type: 'games'; config: GamesConfig }
  )

export type TemplateConfig = IntroConfig | FocusConfig | GamesConfig
