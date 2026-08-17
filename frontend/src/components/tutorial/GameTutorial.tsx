'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Crown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

/*
 * How to Play, in eight steps.
 *
 * The dialog is a fixed 680x600 with three bands — header, scrolling figure and
 * points, footer — so Previous and Next never move between steps. They used to sit
 * under content of wildly different heights, which meant a second click landed on
 * whatever had slid under the cursor.
 *
 * The rules described here are the ones the server actually plays, read out of
 * DeckInitializationService and GameService: a five-card deck of 1/1/3/3/5, one
 * random card from each hand placed on the middle column before the first turn, and
 * a winner decided by who holds more columns — not by holding two of the three,
 * which is only the same thing when no column is tied.
 */

interface GameTutorialProps {
  open: boolean;
  onClose: () => void;
  /** "Start Playing" in game, "Got it" when nobody is signed in yet. */
  finishLabel?: string;
}

const YOU = 'you';
const OPPONENT = 'opponent';
type Side = typeof YOU | typeof OPPONENT;

/** A card as it appears on the board, in miniature: gold for yours, crimson for theirs. */
function MiniCard({ power, name, side }: { power: number; name?: string; side: Side }) {
  const mine = side === YOU;
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center rounded-[5px] border bg-surface-0',
        mine ? 'border-gold-400/70' : 'border-danger/70',
      )}
    >
      <span
        className={cn(
          'absolute left-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full font-display text-[11px] font-bold leading-none',
          mine ? 'bg-gold-400 text-[#1A1206]' : 'bg-danger text-[#2A0B0B]',
        )}
      >
        {power}
      </span>
      {name && (
        <span className="px-1 text-center font-display text-[8px] uppercase leading-tight tracking-wide text-ink-mid">
          {name}
        </span>
      )}
    </div>
  );
}

type BoardCell = { power: number; side: Side } | null;

/** The 3x5 board at figure size. Rows top to bottom, columns left to right. */
function MiniBoard({
  cells,
  highlight = [],
  cellSize = 42,
}: {
  cells: BoardCell[][];
  /** "row,col" keys drawn as legal placements. */
  highlight?: string[];
  cellSize?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        {cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex},${colIndex}`;
            return (
              <div
                key={key}
                style={{ width: cellSize, height: cellSize }}
                className={cn(
                  'rounded-[6px] border border-subtle bg-surface-1',
                  highlight.includes(key) && !cell && 'cell-valid border-arcane-400/40',
                )}
              >
                {cell && <MiniCard power={cell.power} side={cell.side} />}
              </div>
            );
          }),
        )}
      </div>
      <div className="grid w-full grid-cols-3 gap-1.5">
        {['Col 1', 'Col 2', 'Col 3'].map((label) => (
          <span key={label} className="type-micro text-center text-ink-low">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const emptyBoard = (): BoardCell[][] =>
  Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => null));

const openingBoard = (): BoardCell[][] => {
  const board = emptyBoard();
  board[1][1] = { power: 3, side: OPPONENT }; // server places player 2 at (x1, y1)
  board[3][1] = { power: 5, side: YOU }; // and player 1 at (x1, y3)
  return board;
};

/** A hand card at figure size, echoing the real card frame. */
function HandCard({ power, name, dimmed }: { power: number; name: string; dimmed?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-[120px] w-[86px] flex-col items-center justify-center rounded-md border border-gold-400/60 bg-surface-0 shadow-card',
        dimmed && 'opacity-35',
      )}
    >
      <span className="font-display text-[10px] uppercase tracking-[0.14em] text-ink-mid">
        {name}
      </span>
      <span className="mt-1 font-display text-3xl font-bold text-gold-300 tabular">{power}</span>
    </div>
  );
}

interface Step {
  title: string;
  figure: React.ReactNode;
  points: string[];
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Hand of Fate',
    figure: (
      <div className="flex items-end gap-3">
        <HandCard power={1} name="Spark" />
        <div className="scale-110">
          <HandCard power={5} name="Thunder" />
        </div>
        <HandCard power={3} name="Lightning" />
      </div>
    ),
    points: [
      'Two mystics, one board, five cards each.',
      'The board is three columns wide and five rows tall.',
      'Win more columns than your opponent and the duel is yours.',
    ],
  },
  {
    title: 'Your Mystical Deck',
    figure: (
      <div className="flex items-center gap-2">
        <HandCard power={1} name="Spark" />
        <HandCard power={1} name="Spark" />
        <HandCard power={3} name="Lightning" />
        <HandCard power={3} name="Lightning" />
        <HandCard power={5} name="Thunder" />
      </div>
    ),
    points: [
      'Five cards: two Sparks (1), two Lightnings (3), one Thunder (5).',
      'Both players hold exactly the same deck.',
      'Nothing is drawn mid-game — these five are everything you get.',
    ],
  },
  {
    title: 'The Ritual of Beginning',
    figure: <MiniBoard cells={openingBoard()} />,
    points: [
      'Before the first turn, fate takes one random card from each hand.',
      'Both land in the middle column — yours in gold, your opponent’s in crimson.',
      'You start your first turn with the four cards that are left.',
    ],
  },
  {
    title: 'The Card Fate Took',
    figure: (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <HandCard power={1} name="Spark" />
          <HandCard power={1} name="Spark" />
          <HandCard power={3} name="Lightning" />
          <HandCard power={3} name="Lightning" />
        </div>
        <div className="relative">
          <HandCard power={5} name="Thunder" dimmed />
          <span className="type-micro absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-ink-low">
            On the board
          </span>
        </div>
      </div>
    ),
    points: [
      'Which card fate takes is random, and it changes the whole plan.',
      'Lose the Thunder and you must win columns by position, not power.',
      'Keep it and you can seize a column late, in a single move.',
    ],
  },
  {
    title: 'Placing Your Cards',
    figure: (
      <MiniBoard
        cells={openingBoard()}
        highlight={['2,1', '4,1', '3,0', '3,2']}
      />
    ),
    points: [
      'A card may only go next to a card you already own.',
      'Next to means up, down, left or right — never diagonally.',
      'The legal squares light up the moment you pick a card.',
    ],
  },
  {
    title: 'Controlling a Column',
    figure: (
      <div className="flex flex-col items-center gap-3">
        <MiniBoard
          cells={(() => {
            const board = emptyBoard();
            board[1][1] = { power: 3, side: OPPONENT };
            board[3][1] = { power: 5, side: YOU };
            board[2][1] = { power: 3, side: YOU };
            board[0][1] = { power: 3, side: OPPONENT };
            return board;
          })()}
        />
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gold-300">
            You <span className="font-display text-lg font-bold tabular">8</span>
          </span>
          <span className="type-micro text-ink-low">Column 2</span>
          <span className="text-danger">
            Them <span className="font-display text-lg font-bold tabular">6</span>
          </span>
        </div>
      </div>
    ),
    points: [
      'Add up the power of your cards in a column.',
      'The higher total controls it; an equal total controls it for nobody.',
      'The column headers above the board keep the running score.',
    ],
  },
  {
    title: 'Winning the Duel',
    figure: (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-3">
          {[
            { label: 'Col 1', owner: 'them' },
            { label: 'Col 2', owner: 'you' },
            { label: 'Col 3', owner: 'you' },
          ].map((column) => (
            <div key={column.label} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-md border',
                  column.owner === 'you'
                    ? 'border-gold-400/45 bg-gold-400/10'
                    : 'border-danger/45 bg-danger/10',
                )}
              >
                {column.owner === 'you' ? (
                  <Crown size={22} strokeWidth={1.75} className="text-gold-300" />
                ) : (
                  <X size={22} strokeWidth={1.75} className="text-danger" />
                )}
              </div>
              <span className="type-micro text-ink-low">{column.label}</span>
            </div>
          ))}
        </div>
        <p className="type-micro text-gold-300">You take two columns to one</p>
      </div>
    ),
    points: [
      'Whoever controls more columns at the end wins.',
      'The duel ends when the board fills, or when nobody can move.',
      'Either player may propose ending early; both must agree.',
    ],
  },
  {
    title: 'Strategic Tips',
    figure: (
      <MiniBoard
        cells={(() => {
          const board = emptyBoard();
          board[1][1] = { power: 3, side: OPPONENT };
          board[3][1] = { power: 5, side: YOU };
          board[2][1] = { power: 3, side: YOU };
          board[3][2] = { power: 1, side: YOU };
          board[0][1] = { power: 3, side: OPPONENT };
          board[0][0] = { power: 1, side: OPPONENT };
          return board;
        })()}
        highlight={['4,2', '2,2']}
      />
    ),
    points: [
      'Two columns is enough — the third can be conceded on purpose.',
      'Placing next to your own card is also how you deny them room.',
      'Hold the Thunder until a column is close, then take it outright.',
    ],
  },
];

export default function GameTutorial({
  open,
  onClose,
  finishLabel = 'Start Playing',
}: GameTutorialProps) {
  const [index, setIndex] = useState(0);

  // Reopening starts at the beginning rather than wherever it was left.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlayClick={false}
      showCloseButton={false}
      widthClassName="w-[680px] max-w-full"
      className="flex h-[600px] max-h-[90dvh] flex-col overflow-hidden"
      contentClassName="contents"
    >
      {/* Header — 88px, and it does not move */}
      <div className="relative flex h-[88px] shrink-0 flex-col justify-center border-b border-subtle px-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tutorial"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-ink-low transition-colors duration-150 hover:bg-surface-3 hover:text-ink-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400"
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        <h2 className="text-gold-gradient font-display text-2xl font-bold leading-tight">
          {step.title}
        </h2>
        <div className="mt-2 flex items-center gap-3">
          <span className="type-micro text-ink-low">
            Step {index + 1} of {STEPS.length}
          </span>
          <div className="h-[3px] w-40 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-gold-400 transition-[width] duration-200 ease-arcane"
              style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content — the only part that scrolls */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex h-[260px] items-center justify-center">{step.figure}</div>
        <ul className="mt-5 space-y-2.5">
          {step.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-ink-mid">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold-400" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer — 72px, fixed */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-t border-subtle px-6">
        <div className="w-32">
          {!isFirst && (
            <Button variant="ghost" onClick={() => setIndex(index - 1)}>
              <ChevronLeft size={16} strokeWidth={1.75} />
              Previous
            </Button>
          )}
        </div>

        <span className="type-micro text-ink-low">
          Step {index + 1} of {STEPS.length}
        </span>

        <div className="flex w-32 justify-end">
          {isLast ? (
            <Button variant="primary" onClick={onClose}>
              {finishLabel}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setIndex(index + 1)}>
              Next
              <ChevronRight size={16} strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
