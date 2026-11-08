import { useEffect, useState } from 'react'
import { Folder } from 'lucide-react'
import { Link } from 'react-router'
import { CampaignsTable } from '@/components/CampaignsTable'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toMessage } from '@/data/errors'
import { listCampaigns } from '@/data/campaigns'
import type { Campaign } from '@/data/types'

const RECENT_LIMIT = 5

export function RecentCampaignsCard() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped by Retry to run the load effect again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // A response that arrives after a newer load started (or after unmount) is ignored.
    let current = true
    listCampaigns().then(
      (list) => {
        if (current) setCampaigns(list.slice(0, RECENT_LIMIT))
      },
      (e) => {
        if (current) setError(toMessage(e))
      },
    )
    return () => {
      current = false
    }
  }, [attempt])

  function retry() {
    setError(null)
    setCampaigns(null)
    setAttempt((n) => n + 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="size-4" aria-hidden />
          Recent campaigns
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? (
          <div role="alert" className="grid justify-items-start gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={retry}>
              Retry
            </Button>
          </div>
        ) : campaigns === null ? (
          <p className="text-muted-foreground">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <div className="grid justify-items-start gap-2">
            <p className="font-medium">No campaigns yet</p>
            <Link to="/campaigns?new=1" className={buttonVariants({ variant: 'outline' })}>
              Create a campaign
            </Link>
            <Link to="/campaigns" className="text-sm underline underline-offset-4">
              View all campaigns
            </Link>
          </div>
        ) : (
          <>
            <CampaignsTable campaigns={campaigns} />
            <Link to="/campaigns" className="text-sm underline underline-offset-4">
              View all campaigns
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
