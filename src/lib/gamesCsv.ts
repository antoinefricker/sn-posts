import type { Game, GameInput } from '@/data/types'
import { normalizeGameCode } from './games'

/** Columns of the games CSV, as produced by scripts/ffbb-games-to-csv.sh. */
export const GAMES_CSV_COLUMNS = [
  'code',
  'team_name',
  'opponent_name',
  'game_date',
  'kickoff_time',
  'is_home',
  'score_ours',
  'score_theirs',
] as const

export type CsvRowError = { line: number; message: string }
export type ParsedGame = { line: number; input: GameInput }
export type ParsedGamesCsv = { games: ParsedGame[]; errors: CsvRowError[] }

type CsvRecord = { line: number; fields: string[] }

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF, optional BOM. */
function readRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = []
  let fields: string[] = []
  let field = ''
  let quoted = false
  let line = 1
  let recordLine = 1
  let touched = false

  const endField = () => {
    fields.push(field)
    field = ''
  }
  const endRecord = () => {
    endField()
    if (touched || fields.some((f) => f !== '')) records.push({ line: recordLine, fields })
    fields = []
    touched = false
  }

  const source = text.replace(/^﻿/, '')
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else {
        if (c === '\n') line++
        field += c
      }
      continue
    }
    if (c === '"') {
      quoted = true
      touched = true
    } else if (c === ',') {
      endField()
      touched = true
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++
      endRecord()
      line++
      recordLine = line
    } else {
      field += c
      touched = true
    }
  }
  endRecord()
  return records
}

function parseDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value
}

/** 'HH:MM' or 'HH:MM:SS', returned as 'HH:MM:SS'. */
function parseTime(value: string): string | null {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59 || Number(m[3] ?? 0) > 59) return null
  return `${m[1]}:${m[2]}:${m[3] ?? '00'}`
}

function parseBoolean(value: string): boolean | null {
  const v = value.toLowerCase()
  return v === 'true' ? true : v === 'false' ? false : null
}

/** '' is no score (null); anything but a whole number >= 0 is NaN. */
function parseScore(value: string): number | null {
  if (value === '') return null
  return /^\d+$/.test(value) ? Number(value) : Number.NaN
}

/** Parses and validates a games CSV. Invalid rows are reported with their line, valid ones kept. */
export function parseGamesCsv(text: string): ParsedGamesCsv {
  const [header, ...rows] = readRecords(text)
  if (!header) return { games: [], errors: [{ line: 1, message: 'The file is empty' }] }

  const columns = header.fields.map((f) => f.trim().toLowerCase())
  const missing = GAMES_CSV_COLUMNS.filter((c) => !columns.includes(c))
  if (missing.length > 0) {
    return { games: [], errors: [{ line: header.line, message: `Missing column: ${missing.join(', ')}` }] }
  }

  const games: ParsedGame[] = []
  const errors: CsvRowError[] = []
  const seen = new Map<string, number>()

  for (const { line, fields } of rows) {
    const get = (name: (typeof GAMES_CSV_COLUMNS)[number]) => (fields[columns.indexOf(name)] ?? '').trim()
    const fail = (message: string) => errors.push({ line, message })

    const code = normalizeGameCode(get('code'))
    const team = get('team_name')
    const opponent = get('opponent_name')
    if (!code || !team || !opponent) {
      fail('Code, team name and opponent are required')
      continue
    }
    const date = parseDate(get('game_date'))
    if (!date) {
      fail(`Invalid date "${get('game_date')}" (expected YYYY-MM-DD)`)
      continue
    }
    const kickoff = parseTime(get('kickoff_time'))
    if (!kickoff) {
      fail(`Invalid kick-off time "${get('kickoff_time')}" (expected HH:MM)`)
      continue
    }
    const isHome = parseBoolean(get('is_home'))
    if (isHome === null) {
      fail(`Invalid is_home "${get('is_home')}" (expected true or false)`)
      continue
    }
    const ours = parseScore(get('score_ours'))
    const theirs = parseScore(get('score_theirs'))
    if (Number.isNaN(ours) || Number.isNaN(theirs)) {
      fail('Scores must be whole numbers, 0 or more')
      continue
    }
    if ((ours === null) !== (theirs === null)) {
      fail('Enter both scores or leave both empty')
      continue
    }
    const key = code.toLowerCase()
    const firstLine = seen.get(key)
    if (firstLine !== undefined) {
      fail(`Duplicate code "${code}" (first seen on line ${firstLine})`)
      continue
    }
    seen.set(key, line)
    games.push({
      line,
      input: {
        code,
        team_name: team,
        opponent_name: opponent,
        game_date: date,
        kickoff_time: kickoff,
        is_home: isHome,
        score_ours: ours,
        score_theirs: theirs,
      },
    })
  }
  return { games, errors }
}

export type GameUpdate = { id: string; code: string; input: GameInput }
export type GamesImportPlan = {
  create: GameInput[]
  update: GameUpdate[]
  /** Games already in the club with nothing to change. */
  unchanged: number
}

function toInput(game: Game): GameInput {
  return {
    code: game.code,
    team_name: game.team_name,
    opponent_name: game.opponent_name,
    game_date: game.game_date,
    kickoff_time: game.kickoff_time,
    is_home: game.is_home,
    score_ours: game.score_ours,
    score_theirs: game.score_theirs,
  }
}

/**
 * Splits parsed games into new games and updates of existing ones (matched on the trimmed,
 * case-insensitive code). An update refreshes opponent, date, kick-off and home/away; the team name
 * is kept as the club edited it, and a score is only overwritten when the CSV has one.
 */
export function planGamesImport(parsed: ParsedGame[], existing: Game[]): GamesImportPlan {
  const byCode = new Map(existing.map((g) => [normalizeGameCode(g.code).toLowerCase(), g]))
  const plan: GamesImportPlan = { create: [], update: [], unchanged: 0 }

  for (const { input } of parsed) {
    const current = byCode.get(input.code.toLowerCase())
    if (!current) {
      plan.create.push(input)
      continue
    }
    const before = toInput(current)
    const hasScore = input.score_ours !== null
    const after: GameInput = {
      ...before,
      opponent_name: input.opponent_name,
      game_date: input.game_date,
      kickoff_time: input.kickoff_time,
      is_home: input.is_home,
      score_ours: hasScore ? input.score_ours : before.score_ours,
      score_theirs: hasScore ? input.score_theirs : before.score_theirs,
    }
    const changed = (Object.keys(after) as (keyof GameInput)[]).some((k) => after[k] !== before[k])
    if (changed) plan.update.push({ id: current.id, code: current.code, input: after })
    else plan.unchanged++
  }
  return plan
}
