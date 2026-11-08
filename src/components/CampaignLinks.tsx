import { Link } from 'react-router'
import type { GameWithCampaigns } from '@/data/types'

export function CampaignLinks({ campaigns }: { campaigns: GameWithCampaigns['campaigns'] }) {
  if (campaigns.length === 0) {
    return <span className="text-muted-foreground">None</span>
  }
  return (
    <>
      {campaigns.map((campaign, i) => (
        <span key={campaign.id}>
          {i > 0 && ', '}
          <Link to={`/campaigns/${campaign.id}`} className="underline underline-offset-4">
            {campaign.title}
          </Link>
        </span>
      ))}
    </>
  )
}
