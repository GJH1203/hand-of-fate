import type { CSSProperties } from 'react'

import Pips from '@/components/game/Pips'
import { cn } from '@/lib/utils'

/*
 * A finished duel, at a glance.
 *
 * The rules used to be two bulleted lists side by side, and the one thing they could
 * not do was show what a column being "won" actually looks like. This is the same
 * information as a picture: three columns, the power in each, and the two that went
 * your way.
 *
 * It is also where a new player meets the ownership language before meeting it in a
 * real match, so it has to teach the same four channels the board teaches — band at
 * the FOOT for yours and at the HEAD for theirs, vertical hatch against horizontal,
 * a rule printed twice against one printed once, and only then vermillion against
 * prussian. See BoardCard for why colour is last: the two inks measure 1.64:1
 * against each other and could never have carried ownership alone. The old diagram
 * printed a numeral in a tinted box and taught none of that.
 *
 * The position is a real legal one, not decoration: five cards each, and every card
 * orthogonally adjacent to another of its owner's, which is the only placement rule
 * in the game.
 *
 * Everything under the board is derived from the board — the column tallies and the
 * sentence in the caption both. The previous caption was written by hand and said
 * one side had taken the left column 8 to 1 while the squares above it added to
 * something else; a fixture and a sentence that can disagree eventually do.
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
    ? `Two of three ends the duel, so losing ${lost.map(phrase).join(' and ')} cost nothing.`
    : null,
]
  .filter(Boolean)
  .join(' ')

/*
 * One square of the diagram, in the board's own language at a third of its size.
 * The band sits outside the pips at every size, so nothing can eat the ownership
 * signal — the same guarantee BoardCard makes.
 */
function Square({ cell, style }: { cell: Placed | null; style?: CSSProperties }) {
  if (!cell) {
    return <div style={style} className="cell aspect-square" />
  }

  const mine = cell.owner === 'me'

  return (
    <div
      style={style}
      className="relative flex aspect-square items-center justify-center overflow-hidden rounded-card border-rule border-ink bg-paper-raised"
    >
      {/* Yours is printed twice: the inner rule is the second impression. */}
      {mine && <span aria-hidden className="pointer-events-none absolute inset-[2px] border border-ink" />}

      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 h-[14%] min-h-[4px]',
          mine ? 'bottom-0 hatch-mine' : 'top-0 hatch-theirs',
        )}
      />

      <Pips
        power={cell.power}
        className={cn(
          'w-[64%] translate-y-[var(--pip-shift)]',
          mine ? 'text-verm [--pip-shift:-5%]' : 'text-prus [--pip-shift:5%]',
        )}
      />
    </div>
  )
}

/*
 * The board is capped and the caption is not. The squares are aspect-square, so an
 * uncapped board grows to whatever column it is dropped into and fifteen of them
 * become the tallest thing on the page; 220px puts a square at about 66px, which is
 * above the 48px floor the real board is drawn to. The caption keeps the full width
 * of its column, because at the board's width a sentence rags into six lines.
 */
export default function BoardDiagram({ className }: { className?: string }) {
  return (
    <figure className={cn('w-full', className)}>
      {/*
       * The mat, and the board on it. Marked aria-hidden in one piece: ten squares
       * each announcing their own power is noise, and the caption below states the
       * outcome in words, which is what a reader actually needs from a diagram.
       */}
      <div aria-hidden className="max-w-[220px] border-rule border-ink bg-paper-sunk p-[5px]">
        <div className="grid grid-cols-3 gap-1">
          {totals.map((column) => (
            <div
              key={column.name}
              className="relative overflow-hidden border-rule border-ink bg-paper py-[6px] text-center"
            >
              {/*
               * A won column is marked the way a card is — a band on the winner's
               * side, at the foot for you and the head for them. The tally and the
               * squares under it then say the same thing two ways.
               */}
              {column.leader && (
                <span
                  className={cn(
                    'pointer-events-none absolute inset-x-0 h-[4px]',
                    column.leader === 'me' ? 'bottom-0 hatch-mine' : 'top-0 hatch-theirs',
                  )}
                />
              )}
              <span className="type-num text-[11px] leading-none">
                <span className={column.leader === 'me' ? 'text-verm-text' : 'text-ink-3'}>
                  {column.me}
                </span>
                <span className="text-ink-3">:</span>
                <span className={column.leader === 'them' ? 'text-prus' : 'text-ink-3'}>
                  {column.them}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[5px] grid grid-cols-3 gap-1">
          {COLUMNS.map((column, x) =>
            column.map((cell, y) => (
              <Square key={`${x}-${y}`} cell={cell} style={{ gridColumn: x + 1, gridRow: y + 1 }} />
            )),
          )}
        </div>
      </div>

      <figcaption className="mt-4">
        {/*
         * The legend shows the two bands rather than two ink swatches, because the
         * band is what actually tells the sides apart — a pair of colour chips would
         * teach the weakest of the four channels as though it were the only one.
         */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="relative block h-5 w-4 shrink-0 rounded-card border-rule border-ink bg-paper-raised"
            >
              <span className="absolute inset-x-0 bottom-0 h-[4px] hatch-mine" />
            </span>
            <span className="type-label text-ink-2">You</span>
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="relative block h-5 w-4 shrink-0 rounded-card border-rule border-ink bg-paper-raised"
            >
              <span className="absolute inset-x-0 top-0 h-[4px] hatch-theirs" />
            </span>
            <span className="type-label text-ink-2">Them</span>
          </span>
        </div>

        <p className="type-small mt-3 text-ink-2">
          Your cards carry a band at the foot, theirs at the head. {summary}
        </p>
      </figcaption>
    </figure>
  )
}
