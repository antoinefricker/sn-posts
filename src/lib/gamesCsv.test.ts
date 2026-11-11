import { describe, expect, it } from 'vitest'
import type { Game } from '@/data/types'
import { parseGamesCsv, planGamesImport } from './gamesCsv'

const HEADER = 'code,team_name,opponent_name,game_date,kickoff_time,is_home,score_ours,score_theirs'

describe('parseGamesCsv', () => {
  it('parses valid rows, with a played and an upcoming game', () => {
    const { games, errors } = parseGamesCsv(
      `${HEADER}\n17136,Team 3 (DM5),URMATT BC,2026-09-27,14:00:00,false,40,52\n17162,Team 3 (DM5),SELESTAT BC,2026-11-15,09:00:00,true,,\n`,
    )
    expect(errors).toEqual([])
    expect(games.map((g) => g.input)).toEqual([
      {
        code: '17136',
        team_name: 'Team 3 (DM5)',
        opponent_name: 'URMATT BC',
        game_date: '2026-09-27',
        kickoff_time: '14:00:00',
        is_home: false,
        score_ours: 40,
        score_theirs: 52,
      },
      {
        code: '17162',
        team_name: 'Team 3 (DM5)',
        opponent_name: 'SELESTAT BC',
        game_date: '2026-11-15',
        kickoff_time: '09:00:00',
        is_home: true,
        score_ours: null,
        score_theirs: null,
      },
    ])
  })

  it('handles a BOM, CRLF, quoted commas and doubled quotes', () => {
    const { games, errors } = parseGamesCsv(
      `﻿${HEADER}\r\n1,"Team, one","The ""Reds""",2026-01-02,20:30,true,,\r\n`,
    )
    expect(errors).toEqual([])
    expect(games[0].input.team_name).toBe('Team, one')
    expect(games[0].input.opponent_name).toBe('The "Reds"')
    expect(games[0].input.kickoff_time).toBe('20:30:00')
  })

  it('reports the line of each invalid row and keeps the valid ones', () => {
    const { games, errors } = parseGamesCsv(
      [
        HEADER,
        '1,T,O,2026-01-02,20:30,true,,',
        '2,T,O,2026-13-40,20:30,true,,',
        '3,T,O,2026-01-02,25:00,true,,',
        '4,T,O,2026-01-02,20:30,maybe,,',
        '5,T,O,2026-01-02,20:30,true,3,',
        '6,T,O,2026-01-02,20:30,true,-1,2',
        ',T,O,2026-01-02,20:30,true,,',
        '1,T,O,2026-01-03,20:30,true,,',
      ].join('\n'),
    )
    expect(games.map((g) => g.input.code)).toEqual(['1'])
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5, 6, 7, 8, 9])
    expect(errors[6].message).toMatch(/Duplicate code "1".*line 2/)
  })

  it('treats codes as duplicates ignoring case and whitespace', () => {
    const { games, errors } = parseGamesCsv(`${HEADER}\nab1,T,O,2026-01-02,20:30,true,,\n AB1 ,T,O,2026-01-03,20:30,true,,\n`)
    expect(games).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })

  it('rejects a file with a missing column or no content', () => {
    expect(parseGamesCsv('code,team_name\n1,T').errors[0].message).toMatch(/Missing column: opponent_name/)
    expect(parseGamesCsv('').errors[0].message).toMatch(/empty/)
  })

  it('accepts columns in any order', () => {
    const { games, errors } = parseGamesCsv(
      'opponent_name,code,team_name,is_home,kickoff_time,game_date,score_theirs,score_ours\nO,1,T,true,20:30,2026-01-02,5,6',
    )
    expect(errors).toEqual([])
    expect(games[0].input).toMatchObject({ code: '1', opponent_name: 'O', score_ours: 6, score_theirs: 5 })
  })
})

function game(overrides: Partial<Game>): Game {
  return {
    id: 'id-1',
    created_by: null,
    creator_name: null,
    created_at: '',
    updated_at: '',
    code: '1',
    team_name: 'U13',
    opponent_name: 'O',
    game_date: '2026-01-02',
    kickoff_time: '20:30:00',
    is_home: true,
    score_ours: null,
    score_theirs: null,
    ...overrides,
  }
}

function parsed(row: string) {
  return parseGamesCsv(`${HEADER}\n${row}`).games
}

describe('planGamesImport', () => {
  it('creates games whose code is unknown', () => {
    const plan = planGamesImport(parsed('2,T,O,2026-01-02,20:30,true,,'), [game({ code: '1' })])
    expect(plan.create).toHaveLength(1)
    expect(plan.update).toEqual([])
  })

  it('matches existing codes ignoring case and whitespace, and reports unchanged games', () => {
    const plan = planGamesImport(parsed('ab1,T,O,2026-01-02,20:30,true,,'), [game({ code: ' AB1 ' })])
    expect(plan).toEqual({ create: [], update: [], unchanged: 1 })
  })

  it('updates date, opponent and venue but keeps the team name the club chose', () => {
    const plan = planGamesImport(parsed('1,FFBB name,New,2026-02-03,18:00,false,,'), [game({})])
    expect(plan.update).toHaveLength(1)
    expect(plan.update[0].input).toMatchObject({
      team_name: 'U13',
      opponent_name: 'New',
      game_date: '2026-02-03',
      kickoff_time: '18:00:00',
      is_home: false,
    })
  })

  it('fills a score from the CSV but never erases an existing one', () => {
    const withScore = planGamesImport(parsed('1,T,O,2026-01-02,20:30,true,50,40'), [game({})])
    expect(withScore.update[0].input).toMatchObject({ score_ours: 50, score_theirs: 40 })

    const keep = planGamesImport(parsed('1,T,O,2026-01-02,20:30,true,,'), [game({ score_ours: 10, score_theirs: 9 })])
    expect(keep).toEqual({ create: [], update: [], unchanged: 1 })
  })
})
