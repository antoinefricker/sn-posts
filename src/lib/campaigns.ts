import type { CampaignStatus } from '@/data/types'

/** Wording of the campaign delete confirmation; games are never deleted with a campaign. */
export function deleteCampaignDescription(count: number): string {
  const games =
    count === 0 ? 'It has no games.' : count === 1 ? 'Its 1 game stays.' : `Its ${count} games stay.`
  return `Deletes only the campaign and its links. ${games}`
}

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = ['active', 'closed']

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = { active: 'Active', closed: 'Closed' }

export type CampaignStatusFilter = CampaignStatus | 'all'

/** Campaigns having the given status; 'all' keeps every campaign. */
export function filterCampaignsByStatus<T extends { status: CampaignStatus }>(
  campaigns: T[],
  filter: CampaignStatusFilter,
): T[] {
  return filter === 'all' ? campaigns : campaigns.filter((campaign) => campaign.status === filter)
}
