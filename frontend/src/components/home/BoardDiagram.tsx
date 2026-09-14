import { cn } from '@/lib/utils'

/*
 * A finished duel, at a glance.
 *
 * The rules used to be two bulleted lists side by side, and the one thing they could
 * not do was show what a column being "won" actually looks like. This is the same
 * information as a picture: three columns, the power in each, and the two that went
 * to ember. It is also where a new player learns the colour language — your cards
 * are warm, theirs are cold — before they meet it in a real match.
 *
 * The position is a real legal one, not decoration: every card is orthogonally
 * adjacent to another of its owner's, which is the only placement rule in the game.
 */

type Owner = 'me' | 'them' | null

const COLUMNS: { power: number; owner: Owner }[][] = [
  [
    { power: 5, owner: 'me' },
    { power: 3, owner: 'me' },
    { power: 1, owner: 'them' },
    { power: 0, owner: null },
    { power: 0, owner: null },
  ],
  [
    { power: 1, owner: 'me' },
    { power: 5, owner: 'them' },
    { power: 3, owner: 'them' },
    { power: 0, owner: null },
    { power: 0, owner: null },
  ],
  [
    { power: 3, owner: 'me' },
    { power: 3, owner: 'me' },
    { power: 5, owner: 'them' },
    { power: 0, owner: null },
    { power: 0, owner: null },
  ],
]

const totals = COLUMNS.map((column) => ({
  me: column.filter((c) => c.owner === 'me').reduce((sum, c) => sum + c.power, 0),
  them: column.filter((c) => c.owner === 'them').reduce((sum, c) => sum + c.power, 0),
}))

/*
 * The cells are aspect-square, so without a cap the diagram grows to whatever column
 * it is dropped into and a fifteen-square board becomes the tallest thing on the page.
 * 168px puts a cell at about 52px, which is the smallest that still fits a power value.
 */
export default function BoardDiagram({ className }: { className?: string }) {
  return (
    <figure className={cn('w-full max-w-[168px]', className)}>
      <div className="grid grid-cols-3 gap-1.5">
        {totals.map((total, index) => {
          const leader = total.me === total.them ? 'none' : total.me > total.them ? 'me' : 'them'
          return (
            <div
              key={index}
              className={cn(
                'flex items-center justify-center gap-1 rounded-xs border py-1 text-[11px] font-semibold tabular',
                leader === 'me' && 'border-ember-400/45 bg-ember-400/[0.07]',
                leader === 'them' && 'border-steel-400/45 bg-steel-400/[0.07]',
                leader === 'none' && 'border-subtle',
              )}
            >
              <span className={leader === 'me' ? 'text-ember-300' : 'text-ink-low'}>{total.me}</span>
              <span className="text-[10px] font-normal text-ink-low">:</span>
              <span className={leader === 'them' ? 'text-steel-300' : 'text-ink-low'}>
                {total.them}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {COLUMNS.map((column, x) =>
          column.map((cell, y) => (
            <div
              key={`${x}-${y}`}
              style={{ gridColumn: x + 1, gridRow: y + 1 }}
              className={cn(
                'flex aspect-square items-center justify-center rounded-xs border text-[12px] font-bold tabular',
                cell.owner === 'me' && 'border-ember-400/55 bg-ember-400/[0.12] text-ember-300',
                cell.owner === 'them' && 'border-steel-400/55 bg-steel-400/[0.12] text-steel-300',
                cell.owner === null && 'border-subtle bg-white/[0.015]',
              )}
            >
              {cell.owner && cell.power}
            </div>
          )),
        )}
      </div>

      <figcaption className="type-small mt-3 flex items-center gap-x-4 text-ink-low">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-ember-400" />
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-steel-400" />
          Them
        </span>
      </figcaption>
    </figure>
  )
}
