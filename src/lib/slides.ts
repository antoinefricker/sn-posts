import type { CampaignTemplate, FocusConfig, Game, GamesVenue, IntroConfig } from '../data/types'
import { groupGamesByDay, paginateDays, type DayGroup } from './gameSlides'

export const SLIDE_WIDTH = 1080
export const SLIDE_HEIGHT = 1350

export type Slide =
  | { key: string; fileName: string; kind: 'intro'; config: IntroConfig }
  | { key: string; fileName: string; kind: 'focus'; config: FocusConfig }
  | { key: string; fileName: string; kind: 'games'; venue: GamesVenue; days: DayGroup[]; page: number; pageCount: number }

// Indexed by Date#getDay() (0 = Sunday). Hardcoded so it does not depend on runtime ICU locale data.
const DAY_NAMES = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI']

/** '2026-11-14' -> 'SAMEDI'. Built from local date parts so a timezone cannot shift the day. */
export function formatDayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return DAY_NAMES[new Date(y, m - 1, d).getDay()]
}

/** '20:30:00' -> '20H30' */
export function formatKickoff(time: string): string {
  const [h, m] = time.split(':')
  return `${h}H${m}`
}

export function venueLabel(venue: GamesVenue): string {
  return venue === 'home' ? 'DOMICILE' : 'EXTÉRIEUR'
}

type SlideDraft =
  | { key: string; kind: 'intro'; type: 'intro'; config: IntroConfig }
  | { key: string; kind: 'focus'; type: 'focus'; config: FocusConfig }
  | { key: string; kind: 'games'; type: 'games'; venue: GamesVenue; days: DayGroup[]; page: number; pageCount: number }

/** Slides in template position order; games templates expand to one slide per page and vanish when the venue has no games. */
export function buildSlides(templates: CampaignTemplate[], games: Game[]): Slide[] {
  const sorted = [...templates].sort((a, b) => a.position - b.position)
  const drafts: SlideDraft[] = []
  for (const t of sorted) {
    if (t.type === 'intro') {
      drafts.push({ key: t.id, kind: 'intro', type: 'intro', config: t.config })
    } else if (t.type === 'focus') {
      drafts.push({ key: t.id, kind: 'focus', type: 'focus', config: t.config })
    } else {
      const pages = paginateDays(groupGamesByDay(games, t.config.venue))
      pages.forEach((p, i) =>
        drafts.push({ key: `${t.id}-${i + 1}`, kind: 'games', type: 'games', venue: t.config.venue, days: p.days, page: i + 1, pageCount: pages.length }),
      )
    }
  }
  return drafts.map((d, i) => {
    const n = String(i + 1).padStart(2, '0')
    if (d.kind === 'intro') return { key: d.key, fileName: `${n}-intro.png`, kind: 'intro', config: d.config }
    if (d.kind === 'focus') return { key: d.key, fileName: `${n}-focus.png`, kind: 'focus', config: d.config }
    return { key: d.key, fileName: `${n}-games-${d.venue}-${d.page}.png`, kind: 'games', venue: d.venue, days: d.days, page: d.page, pageCount: d.pageCount }
  })
}
