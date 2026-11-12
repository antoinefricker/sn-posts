import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CampaignStatusBadge } from '@/components/CampaignStatusBadge'
import type { Campaign } from '@/data/types'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

function formatDate(value: string): string {
  return dateFormat.format(new Date(value))
}

function gamesLabel(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`
}

type CampaignsTableProps = {
  campaigns: Campaign[]
  /** Renders the action buttons for a row. */
  actions?: (campaign: Campaign) => ReactNode
}

const headClass = 'px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap'
const cellClass = 'px-3 py-2 align-middle'

export function CampaignsTable({ campaigns, actions }: CampaignsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {['Title', 'Status', 'Games', 'Created', 'Updated'].map((label) => (
              <th key={label} scope="col" className={headClass}>
                {label}
              </th>
            ))}
            {actions && (
              <th scope="col" className={headClass}>
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td className={cellClass}>
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {campaign.title}
                </Link>
              </td>
              <td className={cellClass}>
                <CampaignStatusBadge status={campaign.status} />
              </td>
              <td className={`${cellClass} whitespace-nowrap`}>{gamesLabel(campaign.game_count)}</td>
              <td className={`${cellClass} whitespace-nowrap`}>{formatDate(campaign.created_at)}</td>
              <td className={`${cellClass} whitespace-nowrap`}>{formatDate(campaign.updated_at)}</td>
              {actions && (
                <td className={cellClass}>
                  <div className="flex flex-wrap justify-end gap-2">{actions(campaign)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
