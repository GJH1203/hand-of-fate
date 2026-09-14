'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import BoardCard from '@/components/game/BoardCard';
import Pips from '@/components/game/Pips';
import { Modal } from '@/components/ui/modal';
import { layStyle } from '@/lib/game/lay';
import { cn } from '@/lib/utils';

/*
 * How to Play, in eight steps.
 *
 * The dialog is a fixed 680x600 sheet with three bands — header, scrolling figure and
 * points, footer — so Previous and Next never move between steps. They used to sit
 * under content of wildly different heights, which meant a second click landed on
 * whatever had slid under the cursor.
 *
 * The rules described here are the ones the server actually plays, read out of
 * DeckInitializationService and GameService: a five-card deck of 1/1/3/3/5, one
 * random card from each hand placed on the middle column before the first turn, and
 * a winner decided by who holds more columns — not by holding two of the three,
 * which is only the same thing when no column is tied.
 *
 * The figures are drawn with the real board's own pieces — `BoardCard` and `Pips`,
 * on real `.cell` squares — rather than with lookalikes. A tutorial that teaches a
 * private visual language teaches the wrong thing twice: once when it is read, and
 * again in the first duel, when nothing on screen matches it.
 */

interface GameTutorialProps {
  open: boolean;
  onClose: () => void;
  /** "Start playing" in game, "Got it" when nobody is signed in yet. */
  finishLabel?: string;
}

const YOU = 'you';
const OPPONENT = 'opponent';
type Side = typeof YOU | typeof OPPONENT;

/** The three cards the game actually deals, by power. */
const CARD_NAME: Record<number, string> = { 1: 'Spark', 3: 'Lightning', 5: 'Thunder' };

/*
 * Every numeral is set in the mono, including the ones inside a sentence — the type
 * rule has no exception for prose. The copy is authored as plain strings so that
 * editing it does not mean editing markup, and the digits are lifted out of it on
 * the way to the screen.
 */
function numerals(text: string) {
  return text.split(/(\d+)/).map((part, index) =>
    /^\d+$/.test(part) ? (
      <span key={index} className="type-num">
        {part}
      </span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  );
}

type BoardCell = { power: number; side: Side } | null;

/** The 3x5 board at figure size. Rows top to bottom, columns left to right. */
function MiniBoard({
  cells,
  highlight = [],
  ghostPower,
  cellSize = 42,
}: {
  cells: BoardCell[][];
  /** "row,col" keys drawn as legal placements. */
  highlight?: string[];
  /** The power of the card being held, drawn as a ghost impression on those squares. */
  ghostPower?: number;
  cellSize?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        {cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex},${colIndex}`;
            const playable = !cell && highlight.includes(key);
            return (
              <div
                key={key}
                style={{ width: cellSize, height: cellSize }}
                className={cn(
                  'relative cell',
                  // The figure is a picture of a board, not a board: a legal square
                  // is drawn as one but takes no pointer, so it cannot offer a hover
                  // state it would not honour.
                  playable && 'cell--playable pointer-events-none',
                )}
              >
                {cell ? (
                  /*
                   * `.laid` gives the card the same fraction of a degree of rotation
                   * it would have on the real board, derived from this square's
                   * coordinates. The figure reads as laid out rather than typeset.
                   */
                  <span
                    className="laid absolute inset-0 block"
                    // The lay is three custom properties; CSSProperties has no room
                    // for them in its index signature, and `.laid` reads them.
                    style={layStyle(colIndex, rowIndex) as React.CSSProperties}
                  >
                    <BoardCard
                      card={{
                        id: key,
                        name: CARD_NAME[cell.power] ?? 'Card',
                        power: cell.power,
                      }}
                      mine={cell.side === YOU}
                    />
                  </span>
                ) : (
                  playable &&
                  ghostPower !== undefined && (
                    <Pips
                      power={ghostPower}
                      className="absolute left-1/2 top-1/2 w-[64%] -translate-x-1/2 -translate-y-1/2 text-verm opacity-[0.42]"
                    />
                  )
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="grid w-full grid-cols-3 gap-1.5">
        {[1, 2, 3].map((column) => (
          <span key={column} className="type-micro text-center text-ink-3">
            Column {column}
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

/**
 * A card in hand, at figure size.
 *
 * It carries the marks a placed card carries — the band at the foot, the inner rule,
 * the power counted in pips — so the first card a new player ever sees is the one
 * they will have to recognise on the board a minute later.
 */
function HandCard({ power, name, dimmed }: { power: number; name: string; dimmed?: boolean }) {
  return (
    <div
      role="img"
      aria-label={`${name}, power ${power}`}
      className={cn(
        'relative flex h-[120px] w-[86px] flex-col items-center justify-center gap-3 pb-2',
        'border-rule border-ink rounded-card bg-paper-raised',
        dimmed && 'opacity-35',
      )}
    >
      {/* Yours is printed twice: the inner rule is the second impression. */}
      <span aria-hidden className="pointer-events-none absolute inset-[3px] border border-ink" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[9px] hatch-mine"
      />
      <Pips power={power} size={40} className="text-verm" />
      <span className="type-micro text-ink-2">{name}</span>
    </div>
  );
}

/** A column in the end-of-duel figure: whose it is, said the way the board says it. */
function ColumnFlag({ column, owner }: { column: number; owner: Side }) {
  const mine = owner === YOU;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={`Column ${column}: ${mine ? 'yours' : 'theirs'}`}
        className="relative flex h-16 w-16 items-center justify-center border-rule border-ink bg-paper-sunk"
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 h-[9px]',
            mine ? 'bottom-0 hatch-mine' : 'top-0 hatch-theirs',
          )}
        />
        <span aria-hidden className={cn('type-micro', mine ? 'text-verm-text' : 'text-prus')}>
          {mine ? 'You' : 'Them'}
        </span>
      </div>
      <span className="type-micro text-ink-3">Column {column}</span>
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
        <div className="-rotate-2">
          <HandCard power={1} name="Spark" />
        </div>
        <div className="scale-110">
          <HandCard power={5} name="Thunder" />
        </div>
        <div className="rotate-2">
          <HandCard power={3} name="Lightning" />
        </div>
      </div>
    ),
    points: [
      'Two players, one board, five cards each.',
      'The board is three columns wide and five rows tall.',
      'Win more columns than your opponent and the duel is yours.',
    ],
  },
  {
    title: 'The deck you are dealt',
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
      'Five cards: two Sparks, two Lightnings, one Thunder.',
      'Power is counted, not printed: 1 pip for a Spark, 3 for a Lightning, 5 for a Thunder.',
      'Both players hold exactly the same deck.',
      'Nothing is drawn mid-game — these five are everything you get.',
    ],
  },
  {
    title: 'The opening',
    figure: <MiniBoard cells={openingBoard()} />,
    points: [
      'Before the first turn, one card is taken at random from each hand.',
      'Both land in the middle column. Yours carries its band at the foot; theirs at the head.',
      'You start your first turn with the four cards that are left.',
    ],
  },
  {
    title: 'The card the opening takes',
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
          <span className="type-micro absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-ink-3">
            On the board
          </span>
        </div>
      </div>
    ),
    points: [
      'Which card is taken is random, and it changes the whole plan.',
      'Lose the Thunder and you must win columns by position, not power.',
      'Keep it and you can seize a column late, in a single move.',
    ],
  },
  {
    title: 'Placing a card',
    figure: (
      <MiniBoard
        cells={openingBoard()}
        highlight={['2,1', '4,1', '3,0', '3,2']}
        ghostPower={3}
      />
    ),
    points: [
      'A card may only go next to a card you already own.',
      'Next to means up, down, left or right — never diagonally.',
      'Pick a card and every legal square shows a faint impression of the pips you would lay there.',
    ],
  },
  {
    title: 'Winning a column',
    figure: (
      <div className="flex flex-col items-center gap-4">
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
        <div className="flex items-baseline gap-5">
          <span className="flex items-baseline gap-2">
            <span className="type-label text-ink-2">You</span>
            <span className="type-num text-[19px] text-verm-text">8</span>
          </span>
          <span className="type-micro text-ink-3">Column 2</span>
          <span className="flex items-baseline gap-2">
            <span className="type-label text-ink-2">Them</span>
            <span className="type-num text-[19px] text-prus">6</span>
          </span>
        </div>
      </div>
    ),
    points: [
      'Add up the pips of your cards in a column.',
      'The higher total controls it; an equal total controls it for nobody.',
      'The strip above each column keeps the running count.',
    ],
  },
  {
    title: 'Winning the duel',
    figure: (
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-end gap-4">
          <ColumnFlag column={1} owner={OPPONENT} />
          <ColumnFlag column={2} owner={YOU} />
          <ColumnFlag column={3} owner={YOU} />
        </div>
        <p className="type-small text-ink-2">You take two columns to one, and the duel is yours.</p>
      </div>
    ),
    points: [
      'Whoever controls more columns at the end wins.',
      'The duel ends when the board fills, or when nobody can move.',
      'Either player may propose ending early; both must agree.',
    ],
  },
  {
    title: 'Tactics',
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
        /*
         * Every legal square, not a chosen two. The ghost impression means "you may
         * lay a card here" on the real board, so a figure that marks only the two
         * squares worth taking would teach the mark to mean something it does not.
         */
        highlight={['2,0', '2,2', '3,0', '4,1', '4,2']}
        ghostPower={1}
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
  finishLabel = 'Start playing',
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
      className="sheet h-[600px] max-h-[90dvh] overflow-hidden"
      /*
       * The three bands are wrapped rather than `display: contents`, so that the
       * wrapper is a real child of `.sheet` and is lifted above the paper fibre.
       * A `contents` box takes no z-index, and everything inside it would print
       * under the grain instead of on it.
       */
      contentClassName="flex h-full min-h-0 flex-col"
    >
      {/* Header — 88px, and it does not move */}
      <div className="relative flex h-[88px] shrink-0 flex-col justify-center border-b-heavy border-ink px-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tutorial"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border-rule border-transparent text-ink-2 transition-colors duration-ink hover:border-ink hover:text-ink"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        <h2 className="type-h2 text-ink">{step.title}</h2>
        <div className="mt-2 flex items-center gap-4">
          <span className="type-micro text-ink-3">
            Step {index + 1} of {STEPS.length}
          </span>
          {/*
           * The progress rule. A track in the deepest paper with the vermillion
           * plate laid over as much of it as has been read — no radius, no fill
           * that fakes light, and it travels, so it takes the long duration.
           */}
          <div aria-hidden className="h-[3px] w-40 bg-paper-deep">
            <div
              className="h-full bg-verm transition-[width] duration-move ease-settle"
              style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content — the only part that scrolls */}
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
        {/*
         * A floor, not a fixed height. Every figure gets the same vertical berth so
         * the points below start in the same place on most steps, but a taller one
         * pushes rather than overflows — the two tallest used to overlap the rule
         * above and the first point below. Previous and Next are unaffected either
         * way: they live in their own band, which is the whole reason for the bands.
         */}
        <div className="flex min-h-[260px] items-center justify-center">{step.figure}</div>
        <ul className="mt-6 space-y-3">
          {step.points.map((point) => (
            <li key={point} className="type-small flex items-start gap-3 text-ink-2">
              <span aria-hidden className="mt-[7px] h-[5px] w-[5px] shrink-0 rotate-45 bg-verm" />
              <span>{numerals(point)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer — 72px, fixed */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-t-rule border-ink px-7">
        <div className="w-32">
          {!isFirst && (
            <button
              type="button"
              className="btn btn--quiet h-10 px-4"
              onClick={() => setIndex(index - 1)}
            >
              Previous
            </button>
          )}
        </div>

        <span className="type-micro text-ink-3">
          Step {index + 1} of {STEPS.length}
        </span>

        <div className="flex w-32 justify-end">
          {isLast ? (
            <button type="button" className="btn btn--key h-10 px-5" onClick={onClose}>
              {finishLabel}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--key h-10 px-5"
              onClick={() => setIndex(index + 1)}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
