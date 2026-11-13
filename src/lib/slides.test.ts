import { describe, expect, it } from 'vitest'
import type { CampaignTemplate, Game } from '../data/types'
import { buildSlides, dayLabels, formatDayLabel, formatKickoff, venueLabel } from './slides'

const base = { campaign_id: 'c1', created_at: '', updated_at: '' }

function game(id: string, date: string, isHome: boolean, time = '20:00:00'): Game {
  return { id, game_date: date, kickoff_time: time, is_home: isHome } as unknown as Game
}

const intro: CampaignTemplate = { ...base, id: 't-intro', position: 0, type: 'intro', config: { background_path: null, title: 'T', subtitle: 'S' } }
const focus: CampaignTemplate = { ...base, id: 't-focus', position: 2, type: 'focus', config: { badge: 'B', title: 'F', image_path: null } }
const homeT: CampaignTemplate = { ...base, id: 't-home', position: 1, type: 'games', config: { venue: 'home' } }
const awayT: CampaignTemplate = { ...base, id: 't-away', position: 3, type: 'games', config: { venue: 'away' } }

describe('formatDayLabel', () => {
  it('returns French uppercase weekday', () => {
    expect(formatDayLabel('2026-11-14')).toBe('SAMEDI')
    expect(formatDayLabel('2026-11-15')).toBe('DIMANCHE')
    expect(formatDayLabel('2026-11-16')).toBe('LUNDI')
  })
})

describe('dayLabels', () => {
  it('keeps the plain weekday when weekdays differ', () => {
    expect([...dayLabels(['2026-11-14', '2026-11-15']).values()]).toEqual(['SAMEDI', 'DIMANCHE'])
  })
  it('adds the day number when two days share a weekday', () => {
    const labels = dayLabels(['2026-11-14', '2026-11-15', '2026-11-21'])
    expect(labels.get('2026-11-14')).toBe('SAMEDI 14')
    expect(labels.get('2026-11-21')).toBe('SAMEDI 21')
    expect(labels.get('2026-11-15')).toBe('DIMANCHE')
  })
})

describe('formatKickoff', () => {
  it('formats HH:MM:SS as HHhMM', () => {
    expect(formatKickoff('20:30:00')).toBe('20H30')
    expect(formatKickoff('09:05:00')).toBe('09H05')
  })
})

describe('venueLabel', () => {
  it('returns French labels', () => {
    expect(venueLabel('home')).toBe('DOMICILE')
    expect(venueLabel('away')).toBe('EXTÉRIEUR')
  })
})

describe('buildSlides day labels', () => {
  it('numbers repeated weekdays within one venue only', () => {
    const slides = buildSlides([homeT], [game('a', '2026-11-14', true), game('b', '2026-11-21', true), game('c', '2026-11-22', false)])
    const labels = slides.flatMap((s) => (s.kind === 'games' ? s.days.map((d) => d.label) : []))
    expect(labels).toEqual(['SAMEDI 14', 'SAMEDI 21'])
  })
})

describe('buildSlides', () => {
  const games = [game('a', '2026-11-14', true), game('b', '2026-11-15', false)]

  it('orders by position without mutating input', () => {
    const input = [awayT, focus, intro, homeT]
    const slides = buildSlides(input, games)
    expect(slides.map((s) => s.kind)).toEqual(['intro', 'games', 'focus', 'games'])
    expect(input.map((t) => t.id)).toEqual(['t-away', 't-focus', 't-intro', 't-home'])
  })

  it('yields no slide for a venue without games', () => {
    expect(buildSlides([homeT], [game('x', '2026-11-14', false)])).toEqual([])
  })

  it('paginates games and sets pageCount', () => {
    const many = Array.from({ length: 20 }, (_, i) => game(`g${i}`, '2026-11-14', true, `${String(10 + i).padStart(2, '0')}:00:00`))
    const slides = buildSlides([homeT], many)
    expect(slides.length).toBeGreaterThan(1)
    slides.forEach((s, i) => {
      expect(s.kind).toBe('games')
      if (s.kind === 'games') {
        expect(s.pageCount).toBe(slides.length)
        expect(s.page).toBe(i + 1)
        expect(s.venue).toBe('home')
      }
    })
  })

  it('numbers file names contiguously and uniquely; keys are unique', () => {
    const many = Array.from({ length: 20 }, (_, i) => game(`g${i}`, '2026-11-14', true, `${String(10 + i).padStart(2, '0')}:00:00`))
    const slides = buildSlides([intro, homeT, focus, awayT], [...many, game('z', '2026-11-15', false)])
    const names = slides.map((s) => s.fileName)
    expect(new Set(names).size).toBe(names.length)
    names.forEach((n, i) => expect(n.startsWith(String(i + 1).padStart(2, '0') + '-')).toBe(true))
    expect(names[0]).toBe('01-intro.png')
    expect(names[1]).toBe('02-games-home-1.png')
    expect(names).toContain(`${String(slides.length - 1).padStart(2, '0')}-focus.png`)
    expect(names[names.length - 1]).toMatch(/-games-away-1\.png$/)
    const keys = slides.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
