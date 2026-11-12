import { describe, expect, it } from 'vitest'
import { filterCampaignsByStatus, unlinkAllGamesDescription } from './campaigns'

describe('filterCampaignsByStatus', () => {
  const campaigns = [
    { id: 'a', status: 'active' as const },
    { id: 'b', status: 'closed' as const },
    { id: 'c', status: 'active' as const },
  ]

  it('keeps every campaign for "all"', () => {
    expect(filterCampaignsByStatus(campaigns, 'all')).toEqual(campaigns)
  })

  it('keeps only the campaigns with the given status', () => {
    expect(filterCampaignsByStatus(campaigns, 'active').map((c) => c.id)).toEqual(['a', 'c'])
    expect(filterCampaignsByStatus(campaigns, 'closed').map((c) => c.id)).toEqual(['b'])
  })
})

describe('unlinkAllGamesDescription', () => {
  it('says the games stay in the club', () => {
    expect(unlinkAllGamesDescription(1)).toBe(
      'Removes the 1 game from this campaign. They stay in the club and can be linked again.',
    )
    expect(unlinkAllGamesDescription(3)).toContain('Removes all 3 games')
  })
})
