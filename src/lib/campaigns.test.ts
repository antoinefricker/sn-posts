import { describe, expect, it } from 'vitest'
import { filterCampaignsByStatus } from './campaigns'

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
