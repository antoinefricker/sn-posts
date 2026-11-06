import { useState } from 'react'
import type { FormEvent } from 'react'
import { FormField } from '@/components/FormField'
import { FormMessage } from '@/components/FormMessage'
import { Button } from '@/components/ui/button'
import { toMessage } from '@/data/errors'
import type { Game, GameInput } from '@/data/types'
import { normalizeGameCode } from '@/lib/games'

type GameFormProps = {
  initial?: Game
  usedInProjects?: number
  onSubmit: (input: GameInput) => Promise<void>
  onCancel: () => void
}

/** The database returns 'HH:MM:SS'; <input type="time"> wants 'HH:MM'. */
function toTimeInput(value: string | undefined): string {
  return value ? value.slice(0, 5) : ''
}

/** <input type="time"> yields 'HH:MM'; send a full 'HH:MM:SS' back. */
function fromTimeInput(value: string): string {
  return value.length === 5 ? `${value}:00` : value
}

function parseScore(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN
}

export function GameForm({ initial, usedInProjects = 0, onSubmit, onCancel }: GameFormProps) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [teamName, setTeamName] = useState(initial?.team_name ?? '')
  const [opponent, setOpponent] = useState(initial?.opponent_name ?? '')
  const [date, setDate] = useState(initial?.game_date ?? '')
  const [kickoff, setKickoff] = useState(toTimeInput(initial?.kickoff_time))
  const [location, setLocation] = useState(initial?.location ?? '')
  const [scoreOurs, setScoreOurs] = useState(initial?.score_ours?.toString() ?? '')
  const [scoreTheirs, setScoreTheirs] = useState(initial?.score_theirs?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const trimmedCode = normalizeGameCode(code)
    const team = teamName.trim()
    const opp = opponent.trim()
    if (!trimmedCode || !team || !opp || !date || !kickoff) {
      setError('Code, team name, opponent, date and kick-off time are required')
      return
    }
    const ours = parseScore(scoreOurs)
    const theirs = parseScore(scoreTheirs)
    if (Number.isNaN(ours) || Number.isNaN(theirs)) {
      setError('Scores must be whole numbers, 0 or more')
      return
    }
    if ((ours === null) !== (theirs === null)) {
      setError('Enter both scores or leave both empty')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSubmit({
        code: trimmedCode,
        team_name: team,
        opponent_name: opp,
        game_date: date,
        kickoff_time: fromTimeInput(kickoff),
        location: location.trim() || null,
        score_ours: ours,
        score_theirs: theirs,
      })
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {usedInProjects > 0 && (
        <p className="text-sm text-muted-foreground">
          Used in {usedInProjects} projects — changes apply everywhere
        </p>
      )}
      <FormField
        label="Code"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      <FormField
        label="Team name"
        name="team_name"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        required
      />
      <FormField
        label="Opponent"
        name="opponent_name"
        value={opponent}
        onChange={(e) => setOpponent(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Date"
          name="game_date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <FormField
          label="Kick-off"
          name="kickoff_time"
          type="time"
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1">
        <FormField
          label="Location"
          name="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-describedby="field-location-hint"
        />
        <p id="field-location-hint" className="text-xs text-muted-foreground">
          Leave empty for a home game
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Our score"
          name="score_ours"
          type="number"
          min={0}
          step={1}
          value={scoreOurs}
          onChange={(e) => setScoreOurs(e.target.value)}
        />
        <FormField
          label="Their score"
          name="score_theirs"
          type="number"
          min={0}
          step={1}
          value={scoreTheirs}
          onChange={(e) => setScoreTheirs(e.target.value)}
        />
      </div>
      <FormMessage message={error ? { ok: false, text: error } : null} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
