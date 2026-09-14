import type { CSSProperties } from 'react'

import Pips, { OwnerMark } from '@/components/game/Pips'
import { cn } from '@/lib/utils'

/*
 * A finished duel, at a glance — and the altar of the menu page.
 *
 * It is a triptych, which is not a metaphor imposed on the game: the board is three
 * columns, you win by taking two of the three, and that is the form of every
 * devotional painting ever made. So it is drawn as one — an arcade of three arched
 * heads carrying the tallies, and under them fifteen arched niches standing on a
 * gilded field. Gold is the one large passage in the product and this is where it is
 * spent, because it is the object the whole page is arranged around.
 *
 * It is also where a new player meets the ownership language before meeting it in a
 * real match, so it teaches the same four channels the board teaches, in the same
 * order of strength:
 *
 *   figure   a rayed disc for Sol, a crescent for Luna. A shape survives greyscale,
 *            reduction and every form of colour blindness; the metals measure about
 *            1.25:1 against each other and could never have carried this alone.
 *   position the mark sits at the FOOT of yours and the HEAD of theirs — in the
 *            squares and in the column heads above them, so the two agree.
 *   weight   yours is framed twice, theirs once.
 *   metal    gold against silver, and it is LAST. See BoardCard.
 *
 * The position is a real legal one, not decoration: five cards each, and every card
 * orthogonally adjacent to another of its owner's, which is the only placement rule
 * in the game.
 *
 * Everything under the board is derived from the board — the column tallies and the
 * sentence in the caption both. The original caption was written by hand and said one
 * side had taken the left column 8 to 1 while the squares above it added to something
 * else; a fixture and a sentence that can disagree eventually do.
 */

type Placed = { power: number; owner: 'me' | 'them' }

/* Column-major, COLUMNS[x][y], top row first. `null` is an empty square. */
const COLUMNS: (Placed | null)[][] = [
  [
    { power: 5, owner: 'me' },
    { power: 3, owner: 'me' },
    { power: 3, owner: 'them' },
    { power: 1, owner: 'them' },
    null,
  ],
  [null, { power: 3, owner: 'me' }, { power: 3, owner: 'me' }, { power: 5, owner: 'them' }, null],
  [
    null,
    null,
    { power: 1, owner: 'me' },
    { power: 3, owner: 'them' },
    { power: 5, owner: 'them' },
  ],
]

const COLUMN_NAMES = ['left', 'middle', 'right']

const totals = COLUMNS.map((column, index) => {
  const sum = (owner: Placed['owner']) =>
    column.reduce((running, cell) => running + (cell?.owner === owner ? cell.power : 0), 0)
  const me = sum('me')
  const them = sum('them')
  return {
    name: COLUMN_NAMES[index],
    me,
    them,
    leader: me === them ? null : me > them ? ('me' as const) : ('them' as const),
  }
})

type ColumnTotal = (typeof totals)[number]

const phrase = (column: ColumnTotal) => `the ${column.name} column ${column.me} to ${column.them}`

const taken = totals.filter((column) => column.leader === 'me')
const lost = totals.filter((column) => column.leader === 'them')

const summary = [
  taken.length > 0 ? `You took ${taken.map(phrase).join(' and ')}.` : null,
  lost.length > 0
    ? `Two columns of three is the match, so losing ${lost.map(phrase).join(' and ')} cost nothing.`
    : null,
]
  .filter(Boolean)
  .join(' ')

/*
 * One square of the diagram, in the board's own language at a third of its size.
 * The owner's figure sits outside the stars at every size, so the count and the owner
 * can always both be read — the same guarantee BoardCard makes.
 */
function Square({ cell, style }: { cell: Placed | null; style?: CSSProperties }) {
  if (!cell) {
    return <div style={style} className="cell aspect-square" />
  }

  const mine = cell.owner === 'me'

  return (
    <div
      style={style}
      className={cn(
        'relative flex aspect-square items-center justify-center overflow-hidden',
        'rounded-arch border-rule bg-night-1',
        mine ? 'border-gold' : 'border-luna-deep',
      )}
    >
      {/* Framed twice if it is yours: the inner keyline is the second pass. */}
      {mine && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[2px] rounded-arch border border-gold-deep"
        />
      )}

      <Pips
        power={cell.power}
        className={cn(
          'w-[58%] translate-y-[var(--pip-shift)]',
          mine ? '[--pip-shift:-7%] text-gold-lit' : '[--pip-shift:7%] text-luna-lit',
        )}
      />

      <OwnerMark
        mine={mine}
        className={cn(
          'pointer-events-none absolute left-1/2 aspect-square h-[15%] max-h-[14px] min-h-[8px] w-auto -translate-x-1/2',
          mine ? 'bottom-[5%] text-gold' : 'top-[5%] text-luna',
        )}
      />
    </div>
  )
}

/*
 * One head of the arcade: a column's tally, in an arch of its own.
 *
 * Both totals are always set in their owner's metal, because a total is a fact about
 * a player and not about who is winning. Whose column it is, is carried by the
 * leader's figure and by WHICH END OF THE ARCH IT STANDS AT — the foot for Sol, the
 * apex for Luna, exactly as on the cards below. The three slots are a fixed grid so
 * the numerals of all three heads sit on one line whichever way the columns went.
 */
function Head({ column }: { column: ColumnTotal }) {
  return (
    <div
      className={cn(
        'grid h-[58px] grid-rows-[13px_auto_13px] items-center justify-items-center gap-[3px] rounded-arch border-rule bg-night-2 px-1 py-[5px]',
        column.leader === 'me'
          ? 'border-gold'
          : column.leader === 'them'
            ? 'border-luna-deep'
            : 'border-gold-deep',
      )}
    >
      <span className="flex h-full items-start">
        {column.leader === 'them' && (
          <OwnerMark mine={false} className="h-[11px] w-[11px] text-luna" />
        )}
      </span>

      <span className="type-num flex items-center text-[15px] leading-none">
        <span className="text-gold-lit">{column.me}</span>
        <span aria-hidden className="mx-[4px] text-parchment-3">
          :
        </span>
        <span className="text-luna-lit">{column.them}</span>
      </span>

      <span className="flex h-full items-end">
        {column.leader === 'me' && <OwnerMark mine className="h-[11px] w-[11px] text-gold" />}
      </span>
    </div>
  )
}

/*
 * One chip of the legend: a card at the size of a thumbnail, so what is being named
 * is the actual mark in its actual place rather than a swatch of metal. A pair of
 * colour chips would teach the weakest of the four channels as though it were the
 * only one.
 */
function LegendCard({ mine }: { mine: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block h-7 w-[22px] shrink-0 rounded-arch border-rule bg-night-1',
        mine ? 'border-gold' : 'border-luna-deep',
      )}
    >
      {mine && (
        <span className="pointer-events-none absolute inset-[2px] rounded-arch border border-gold-deep" />
      )}
      <OwnerMark
        mine={mine}
        className={cn(
          'absolute left-1/2 h-2 w-2 -translate-x-1/2',
          mine ? 'bottom-[3px] text-gold' : 'top-[3px] text-luna',
        )}
      />
    </span>
  )
}

/*
 * The board is capped and the caption is not. The squares are aspect-square, so an
 * uncapped board grows to whatever column it is dropped into and fifteen of them
 * become the tallest thing on the page; 320px puts a square at about 97px, which is
 * twice the 48px floor the real board is drawn to and reads as an object rather than
 * as a thumbnail. The caption keeps a measure of its own, because at the board's
 * width a sentence rags into six lines.
 */
export default function BoardDiagram({ className }: { className?: string }) {
  return (
    <figure className={cn('flex w-full flex-col items-center', className)}>
      {/*
       * Marked aria-hidden in one piece: fifteen squares each announcing their own
       * power is noise, and the caption below states the outcome in words, which is
       * what a reader actually needs from a diagram.
       */}
      <div aria-hidden className="w-full max-w-[320px]">
        <div className="grid grid-cols-3 gap-[6px]">
          {totals.map((column) => (
            <Head key={column.name} column={column} />
          ))}
        </div>

        {/*
         * The gilded field. In an icon the figures stand on uncreated light, and this
         * is the one large passage of gold in the product — which is what makes the
         * board the thing the eye goes to on any screen it appears on.
         */}
        <div className="gilt mt-[6px] border-rule border-gold-deep p-[6px]">
          <div className="grid grid-cols-3 gap-[6px]">
            {COLUMNS.map((column, x) =>
              column.map((cell, y) => (
                <Square
                  key={`${x}-${y}`}
                  cell={cell}
                  style={{ gridColumn: x + 1, gridRow: y + 1 }}
                />
              )),
            )}
          </div>
        </div>
      </div>

      <figcaption className="mt-7 flex w-full flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="flex items-center gap-2.5">
            <LegendCard mine />
            <span className="type-label text-parchment-2">Sol · you</span>
          </span>
          <span className="flex items-center gap-2.5">
            <LegendCard mine={false} />
            <span className="type-label text-parchment-2">Luna · them</span>
          </span>
        </div>

        <p className="type-small mt-5 max-w-[52ch] text-center text-parchment-2">
          Your cards carry the sun at the foot. Theirs carry the moon at the head. {summary}
        </p>
      </figcaption>
    </figure>
  )
}
