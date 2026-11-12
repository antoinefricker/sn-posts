import type { CampaignStatus } from '@/data/types'
import { CAMPAIGN_STATUS_LABELS } from '@/lib/campaigns'

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={
        status === 'active'
          ? 'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
          : 'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
      }
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  )
}
