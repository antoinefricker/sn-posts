import { describe, expect, it } from 'vitest'
import type { CampaignTemplate, FocusConfig, IntroConfig } from '@/data/types'
import { defaultConfig, deleteTemplateDescription, templateSummary, validateConfig } from './templates'

const base = { id: 't1', campaign_id: 'c1', position: 0, created_at: '', updated_at: '' }

describe('defaultConfig', () => {
  it('returns empty defaults per type', () => {
    expect(defaultConfig('games')).toEqual({ venue: 'home' })
    expect(defaultConfig('intro')).toEqual({ background_path: null, title: '', subtitle: '' })
    expect(defaultConfig('focus')).toEqual({ badge: '', title: '', image_path: null })
  })
})

describe('validateConfig', () => {
  const intro: IntroConfig = { background_path: null, title: 'Hello', subtitle: '' }
  const focus: FocusConfig = { badge: 'MVP', title: 'Player', image_path: 'a.png' }

  it('validates intro', () => {
    expect(validateConfig('intro', { ...intro, title: '  ' })).toBe('Title is required')
    expect(validateConfig('intro', { ...intro, title: 'x'.repeat(61) })).toBe(
      'Title must be 60 characters or fewer',
    )
    expect(validateConfig('intro', { ...intro, subtitle: 'x'.repeat(101) })).toBe(
      'Subtitle must be 100 characters or fewer',
    )
    expect(validateConfig('intro', { ...intro, title: 'x'.repeat(60), subtitle: 'x'.repeat(100) })).toBeNull()
    expect(validateConfig('intro', intro)).toBeNull()
  })

  it('validates focus', () => {
    expect(validateConfig('focus', { ...focus, badge: '' })).toBe('Badge is required')
    expect(validateConfig('focus', { ...focus, badge: 'x'.repeat(21) })).toBe(
      'Badge must be 20 characters or fewer',
    )
    expect(validateConfig('focus', { ...focus, title: ' ' })).toBe('Title is required')
    expect(validateConfig('focus', { ...focus, image_path: null })).toBe('Image is required')
    expect(validateConfig('focus', { ...focus, title: 'x'.repeat(61) })).toBe(
      'Title must be 60 characters or fewer',
    )
    expect(validateConfig('focus', focus)).toBeNull()
  })

  it('validates games', () => {
    expect(validateConfig('games', { venue: 'neither' } as never)).toBe('Venue must be home or away')
    expect(validateConfig('games', { venue: 'away' })).toBeNull()
  })
})

describe('templateSummary', () => {
  const counts = { home: 4, away: 1 }
  const games = (venue: 'home' | 'away'): CampaignTemplate => ({ ...base, type: 'games', config: { venue } })

  it('summarises games', () => {
    expect(templateSummary(games('home'), counts)).toBe('Home · 4 games')
    expect(templateSummary(games('away'), counts)).toBe('Away · 1 game')
    expect(templateSummary(games('home'), { home: 0, away: 0 })).toBe('Home · No games')
  })

  it('summarises intro and focus', () => {
    const intro: CampaignTemplate = {
      ...base,
      type: 'intro',
      config: { background_path: null, title: 'Welcome', subtitle: '' },
    }
    const focus: CampaignTemplate = {
      ...base,
      type: 'focus',
      config: { badge: 'MVP', title: 'Jane', image_path: 'a.png' },
    }
    expect(templateSummary(intro, counts)).toBe('Welcome')
    expect(templateSummary(focus, counts)).toBe('MVP · Jane')
  })
})

describe('deleteTemplateDescription', () => {
  it('names the type and says games and images stay', () => {
    const t: CampaignTemplate = { ...base, type: 'games', config: { venue: 'home' } }
    const text = deleteTemplateDescription(t)
    expect(text).toContain('Games')
    expect(text).toContain("campaign's games and uploaded images are not deleted")
  })
})
