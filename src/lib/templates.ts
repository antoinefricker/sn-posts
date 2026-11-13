import type {
  CampaignTemplate,
  FocusConfig,
  GamesConfig,
  GamesVenue,
  IntroConfig,
  TemplateConfig,
  TemplateType,
} from '@/data/types'

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  intro: 'Intro',
  focus: 'Focus',
  games: 'Games',
}

export const INTRO_TITLE_MAX_LENGTH = 60
export const INTRO_SUBTITLE_MAX_LENGTH = 100
export const FOCUS_TITLE_MAX_LENGTH = 60
export const BADGE_MAX_LENGTH = 20

/** Empty config for a newly created template of the given type. */
export function defaultConfig(type: TemplateType): TemplateConfig {
  switch (type) {
    case 'intro':
      return { background_path: null, title: '', subtitle: '' }
    case 'focus':
      return { badge: '', title: '', image_path: null }
    case 'games':
      return { venue: 'home' }
  }
}

/** First validation error of a template config, or null when it is valid. */
export function validateConfig(type: TemplateType, config: TemplateConfig): string | null {
  switch (type) {
    case 'intro': {
      const { title, subtitle } = config as IntroConfig
      const trimmedTitle = title.trim()
      if (trimmedTitle === '') return 'Title is required'
      if (trimmedTitle.length > INTRO_TITLE_MAX_LENGTH)
        return `Title must be ${INTRO_TITLE_MAX_LENGTH} characters or fewer`
      if (subtitle.trim().length > INTRO_SUBTITLE_MAX_LENGTH)
        return `Subtitle must be ${INTRO_SUBTITLE_MAX_LENGTH} characters or fewer`
      return null
    }
    case 'focus': {
      const { badge, title, image_path } = config as FocusConfig
      const trimmedBadge = badge.trim()
      if (trimmedBadge === '') return 'Badge is required'
      if (trimmedBadge.length > BADGE_MAX_LENGTH) return `Badge must be ${BADGE_MAX_LENGTH} characters or fewer`
      const trimmedTitle = title.trim()
      if (trimmedTitle === '') return 'Title is required'
      if (trimmedTitle.length > FOCUS_TITLE_MAX_LENGTH)
        return `Title must be ${FOCUS_TITLE_MAX_LENGTH} characters or fewer`
      if (!image_path) return 'Image is required'
      return null
    }
    case 'games': {
      const { venue } = config as GamesConfig
      return venue === 'home' || venue === 'away' ? null : 'Venue must be home or away'
    }
  }
}

/** One-line description of a template for the campaign's template list. */
export function templateSummary(t: CampaignTemplate, gameCountByVenue: Record<GamesVenue, number> | null): string {
  switch (t.type) {
    case 'intro':
      return t.config.title
    case 'focus':
      return `${t.config.badge} · ${t.config.title}`
    case 'games': {
      const venue = t.config.venue === 'home' ? 'Home' : 'Away'
      if (!gameCountByVenue) return `${venue} · Loading games…`
      const count = gameCountByVenue[t.config.venue]
      const games = count === 0 ? 'No games' : count === 1 ? '1 game' : `${count} games`
      return `${venue} · ${games}`
    }
  }
}

/** Confirmation text for deleting a template; games and uploaded images are never deleted. */
export function deleteTemplateDescription(t: CampaignTemplate): string {
  return `Deletes this ${TEMPLATE_TYPE_LABELS[t.type]} template. The campaign's games and uploaded images are not deleted.`
}

/** Moves `activeId` to the position of `overId`; unchanged when either id is unknown. */
export function reorderIds(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  if (from === -1 || to === -1 || from === to) return ids
  const next = ids.slice()
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}
