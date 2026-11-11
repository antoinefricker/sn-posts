import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { FormMessage } from '@/components/FormMessage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toMessage } from '@/data/errors'
import { importGames } from '@/data/games'
import type { Game } from '@/data/types'
import { parseGamesCsv, planGamesImport } from '@/lib/gamesCsv'
import type { CsvRowError, GamesImportPlan } from '@/lib/gamesCsv'

type ImportGamesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The games already in the club, to tell new games from updates. */
  existing: Game[]
  /** Refreshes the caller's list after a successful import. */
  onImported: () => Promise<void> | void
}

type Preview = { fileName: string; plan: GamesImportPlan; errors: CsvRowError[] }

const MAX_ERRORS_SHOWN = 10

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export function ImportGamesDialog({ open, onOpenChange, existing, onImported }: ImportGamesDialogProps) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Remounts the file input after a reset so the same file can be picked again.
  const [inputKey, setInputKey] = useState(0)

  function reset() {
    setPreview(null)
    setError(null)
    setInputKey((k) => k + 1)
  }

  // Esc, backdrop and the close button are swallowed while the import is running.
  function handleOpenChange(next: boolean) {
    if (busy) return
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setPreview(null)
    setError(null)
    if (!file) return
    try {
      const { games, errors } = parseGamesCsv(await file.text())
      setPreview({ fileName: file.name, plan: planGamesImport(games, existing), errors })
    } catch (e) {
      setError(toMessage(e))
    }
  }

  async function handleImport() {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      await importGames(preview.plan)
      reset()
      onOpenChange(false)
      await onImported()
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const plan = preview?.plan
  const changes = plan ? plan.create.length + plan.update.length : 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import games from CSV</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="field-games-csv">CSV file</Label>
            <Input
              key={inputKey}
              id="field-games-csv"
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => void handleFile(e)}
              aria-describedby="field-games-csv-hint"
            />
            <p id="field-games-csv-hint" className="text-xs text-muted-foreground">
              Columns: code, team_name, opponent_name, game_date, kickoff_time, is_home, score_ours,
              score_theirs. A game whose code already exists is updated (opponent, date, kick-off and
              home/away; a score only when the file has one).
            </p>
          </div>

          {preview && plan && (
            <div className="grid gap-3" aria-live="polite">
              <p className="text-sm">
                <span className="font-medium">{preview.fileName}</span>:{' '}
                {plural(plan.create.length, 'game', 'games')} to create,{' '}
                {plural(plan.update.length, 'game', 'games')} to update, {plan.unchanged} unchanged
                {preview.errors.length > 0 && `, ${plural(preview.errors.length, 'row', 'rows')} skipped`}.
              </p>
              {preview.errors.length > 0 && (
                <ul className="max-h-40 overflow-y-auto rounded-md border p-2 text-xs text-destructive">
                  {preview.errors.slice(0, MAX_ERRORS_SHOWN).map((e) => (
                    <li key={`${e.line}-${e.message}`}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                  {preview.errors.length > MAX_ERRORS_SHOWN && (
                    <li>…and {preview.errors.length - MAX_ERRORS_SHOWN} more</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <FormMessage message={error ? { ok: false, text: error } : null} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleImport()} disabled={busy || changes === 0} aria-busy={busy}>
              {busy ? 'Importing…' : changes === 0 ? 'Import' : `Import ${plural(changes, 'game', 'games')}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
