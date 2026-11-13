import type { CSSProperties } from 'react'
import { Plane } from 'lucide-react'
import defaultBackground from '@/assets/slide-background.svg'
import type { Game, GamesVenue } from '@/data/types'
import { GAMES_SLIDE_ROW_CAPACITY, matchupSides, type DayGroup } from '@/lib/gameSlides'
import { estimateLines, fitFontSize, wordsFit } from '@/lib/nameFit'
import { formatDayLabel, formatKickoff, SLIDE_HEIGHT, venueLabel } from '@/lib/slides'
import { SLIDE_LAVENDER, SLIDE_PURPLE } from './SlideFrame'

/** Day headers and game rows share one height so a full page always fits under the title. */
const ROW_HEIGHT = Math.floor(SLIDE_HEIGHT / (GAMES_SLIDE_ROW_CAPACITY + 2))
const BAND = 'rgba(221, 211, 240, 0.6)'

/** The left (host) column is wider, as on the club's posts. */
const LEFT_WIDTH = 340
const RIGHT_WIDTH = 300

const NAME_SIZES = [62, 56, 50, 44, 38, 32, 26]
const LETTER_SPACING = 2
const LINE_HEIGHT = 1.05

/**
 * Font size for a name in a column `width` px wide. Prefers one line at a readable size, otherwise the
 * largest size whose word-wrapped lines fit the row, never splitting a word.
 */
function nameSize(name: string, width: number): number {
  const singleLine = NAME_SIZES.find(
    (s) => s >= 44 && wordsFit(name, width, s, LETTER_SPACING) && estimateLines(name, width, s, LETTER_SPACING) === 1,
  )
  return (
    singleLine ??
    fitFontSize(name, width, NAME_SIZES, { letterSpacing: LETTER_SPACING, lineHeight: LINE_HEIGHT, maxHeight: ROW_HEIGHT - 10, maxLines: 3 })
  )
}

function Name({ value, width }: { value: string; width: number }) {
  return (
    <div
      style={{
        fontSize: nameSize(value, width),
        lineHeight: LINE_HEIGHT,
        letterSpacing: LETTER_SPACING,
        textAlign: 'center',
        // Last resort for a single word too long for the column at the minimum size.
        overflowWrap: 'break-word',
      }}
    >
      {value}
    </div>
  )
}

const outlined = (color: string, stroke: string, width: number): CSSProperties => ({
  color,
  WebkitTextStroke: `${width}px ${stroke}`,
  paintOrder: 'stroke fill',
})

function GameRow({ game, venue }: { game: Game; venue: GamesVenue }) {
  const sides = matchupSides(game, venue)
  return (
    <div
      style={{
        height: ROW_HEIGHT,
        display: 'grid',
        gridTemplateColumns: `80px 160px ${LEFT_WIDTH}px 90px ${RIGHT_WIDTH}px`,
        alignItems: 'center',
        columnGap: 10,
        textTransform: 'uppercase',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {venue === 'away' && <Plane size={70} fill={SLIDE_PURPLE} stroke={SLIDE_PURPLE} strokeWidth={1} />}
      </div>
      <div style={{ fontSize: 64, transform: 'skewX(-10deg)', textAlign: 'center', ...outlined(SLIDE_LAVENDER, '#fff', 6) }}>
        {formatKickoff(game.kickoff_time)}
      </div>
      <Name value={sides.left} width={LEFT_WIDTH} />
      <div style={{ fontSize: 76, textAlign: 'center', transform: 'skewX(-12deg)', ...outlined('transparent', SLIDE_LAVENDER, 3) }}>VS</div>
      <Name value={sides.right} width={RIGHT_WIDTH} />
    </div>
  )
}

function DayHeader({ label }: { label: string }) {
  return (
    <div style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'flex-end', gap: 16, paddingLeft: 140, paddingBottom: 18 }}>
      <span style={{ fontSize: 72, lineHeight: 1, letterSpacing: 4 }}>{label}</span>
      <span style={{ flex: 1, height: 5, marginBottom: 20, background: SLIDE_PURPLE }} />
    </div>
  )
}

function Day({ day, venue }: { day: DayGroup; venue: GamesVenue }) {
  return (
    <>
      <DayHeader label={day.label ?? formatDayLabel(day.date)} />
      {/* The band starts right of the plane column, as in the club's posts. */}
      <div style={{ marginLeft: 90, background: BAND }}>
        <div style={{ marginLeft: -70, paddingRight: 30 }}>
          {day.games.map((g) => (
            <GameRow key={g.id} game={g} venue={venue} />
          ))}
        </div>
      </div>
    </>
  )
}

/** One page of a venue's games: venue title top right, day headers with a rule, game rows on a lilac band. */
export function GamesSlide({ venue, days, page, pageCount }: { venue: GamesVenue; days: DayGroup[]; page: number; pageCount: number }) {
  const titleHeight = SLIDE_HEIGHT - GAMES_SLIDE_ROW_CAPACITY * ROW_HEIGHT
  return (
    <>
      <img src={defaultBackground} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'relative', height: titleHeight, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 50 }}>
        <h1 style={{ margin: 0, fontSize: 150, lineHeight: 1, letterSpacing: 4, ...outlined('#fff', SLIDE_PURPLE, 12) }}>{venueLabel(venue)}</h1>
        {pageCount > 1 && (
          <span style={{ position: 'absolute', left: 50, top: 50, fontSize: 40, color: SLIDE_LAVENDER }}>
            {page}/{pageCount}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        {days.map((d, i) => (
          <Day key={`${d.date}-${i}`} day={d} venue={venue} />
        ))}
      </div>
    </>
  )
}
