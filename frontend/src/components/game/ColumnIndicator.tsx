'use client';

import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { ColumnScore } from '@/types/game';

interface ColumnIndicatorProps {
  columnIndex: number;
  columnScore?: ColumnScore;
  players: Record<string, string>;
  currentPlayerId: string;
}

type Direction = 'up' | 'down';
type Leader = 'me' | 'them' | 'none';

/*
 * The rule that carries the lead — in weight, in ink, and in WHICH HALF OF THE
 * COLUMN IT RUNS UNDER.
 *
 * Weight alone only separates owned from level. Between the two owners this was
 * a 3px bar in vermillion against a 3px bar in prussian, and those two inks
 * measure 1.64:1 against each other, so in greyscale — or for a player with
 * either common form of red-green colour blindness — the column head was the one
 * place in the application where whose column it is could not be read at all.
 *
 * Position fixes it, and the strip already had the answer in it: your total is
 * printed on the left of the pair and theirs on the right. So the lead rule runs
 * under the half that is winning. It is a tally mark under the winning number,
 * it is unmistakable without colour, and it is the same primary channel the
 * cards use. A level column keeps the full-width hairline, because nobody's half
 * has earned it.
 */
const RULE: Record<Leader, string> = {
  me: 'left-0 right-1/2 h-[3px] bg-verm',
  them: 'left-1/2 right-0 h-[3px] bg-prus',
  none: 'inset-x-0 h-[1.5px] bg-rule-min',
};

const ORIGIN: Record<Leader, string> = { me: 'left', them: 'right', none: 'center' };

/**
 * A total, set as a slug in its stick.
 *
 * The slot is one em tall with the overflow cut, so a digit that changes leaves
 * and its replacement arrives in the direction the value moved — up when it
 * gained, down when it lost. The width is fixed in `ch` against tabular figures
 * because a slot that resized mid-roll reads as a glitch rather than as motion.
 *
 * The outgoing digit runs the opposite keyframe in reverse: `slug-roll-down`
 * played backwards starts at rest and exits upward, which is the leaving half of
 * a gain. It is `aria-hidden` — for the fifth of a second both digits are in the
 * DOM, and a screen reader announcing "three two" for a score of two is worse
 * than no animation at all.
 */
function Slug({
  value,
  from,
  direction,
  className,
}: {
  value: number;
  from?: number;
  direction?: Direction;
  className?: string;
}) {
  const rolling = direction !== undefined && from !== undefined;

  return (
    <span className={cn('relative block h-[1em] w-[2ch] overflow-hidden text-center', className)}>
      {rolling && (
        <span
          aria-hidden
          className="absolute inset-0 block"
          style={{
            animation: `${direction === 'up' ? 'slug-roll-down' : 'slug-roll-up'} var(--t-move) var(--ease-settle) reverse forwards`,
          }}
        >
          {from}
        </span>
      )}
      <span
        className="block"
        style={
          rolling
            ? { animation: `slug-roll-${direction} var(--t-move) var(--ease-settle)` }
            : undefined
        }
      >
        {value}
      </span>
    </span>
  );
}

function directionOf(before: number, after: number): Direction | undefined {
  if (after === before) return undefined;
  return after > before ? 'up' : 'down';
}

/**
 * The strip at the head of a column: the two totals, and whose column it is.
 *
 * Both totals are always printed in their own plate — yours vermillion, theirs
 * prussian — because a total is a fact about a player and not about who is
 * winning. Which is a change: the leader used to be the strip's colour, so a
 * number changed ink when somebody else overtook it and you could not read your
 * own score without first working out whose it was.
 *
 * The lead is carried by the rule under the strip instead, and that rule is the
 * point of the whole component. A total changes thirty times a match; a column
 * changes hands four to eight times, and those are the only moments that decide
 * the game. So the two motions are deliberately different sizes: a total rolls
 * one slug in its stick, and a column changing hands redraws its rule in the new
 * leader's ink as a fresh pass of the press, wiping from that player's side of
 * the strip.
 */
export default function ColumnIndicator({
  columnIndex,
  columnScore,
  players,
  currentPlayerId,
}: ColumnIndicatorProps) {
  const scores = columnScore?.playerScores ?? {};
  const mine = scores[currentPlayerId] ?? 0;
  const theirId = Object.keys(players).find((id) => id !== currentPlayerId);
  const theirs = theirId ? (scores[theirId] ?? 0) : 0;

  const leader: Leader =
    columnScore?.isTie || !columnScore?.winnerId
      ? 'none'
      : columnScore.winnerId === currentPlayerId
        ? 'me'
        : 'them';

  // A score that changes rolls; a score that has not, does not. The gate is a
  // ref rather than state because comparing against the last rendered totals is
  // exactly the thing that must not itself cause a render.
  const [roll, setRoll] = useState<{
    mine?: Direction;
    theirs?: Direction;
    fromMine: number;
    fromTheirs: number;
  } | null>(null);
  const previous = useRef({ mine, theirs });

  useEffect(() => {
    const before = previous.current;
    if (before.mine === mine && before.theirs === theirs) return;
    previous.current = { mine, theirs };
    setRoll({
      mine: directionOf(before.mine, mine),
      theirs: directionOf(before.theirs, theirs),
      fromMine: before.mine,
      fromTheirs: before.theirs,
    });
    const timer = window.setTimeout(() => setRoll(null), 260);
    return () => window.clearTimeout(timer);
  }, [mine, theirs]);

  /*
   * The ink on the sheet lags the ink the data says it should be, for exactly
   * the length of one press pass. That is not a delay for its own sake: if the
   * rule simply changed colour and then wiped, the new ink would already be on
   * screen at full width for the frame before the wipe began, and the wipe would
   * be a redraw of something you had seen. Holding the old pass until the new one
   * covers it is what a second pass of the press actually looks like.
   *
   * The incoming rule is keyed on its leader so it is a new element every time —
   * an animation that has already run on an element will not run again.
   */
  const [printed, setPrinted] = useState<Leader>(leader);
  const [incoming, setIncoming] = useState<Leader | null>(null);

  useEffect(() => {
    if (leader === printed) {
      setIncoming(null);
      return;
    }
    setIncoming(leader);
    const timer = window.setTimeout(() => {
      setPrinted(leader);
      setIncoming(null);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [leader, printed]);

  const leaderName =
    leader === 'me' ? 'You' : leader === 'them' && theirId ? players[theirId] : undefined;

  return (
    <div
      title={
        leaderName
          ? `Column ${columnIndex + 1} — ${leaderName} leads ${Math.max(mine, theirs)} to ${Math.min(mine, theirs)}`
          : `Column ${columnIndex + 1} — level at ${mine}`
      }
      /*
       * h-11 is `--headers` in the arena's size arithmetic, which derives the
       * cell size from what is left of the viewport. Changing it here silently
       * mis-sizes the entire board.
       */
      className="relative flex h-11 flex-col items-center justify-center gap-[3px]"
    >
      <span className="type-micro text-ink-3">Col {columnIndex + 1}</span>

      <span className="type-num flex items-center gap-1 text-[15px] leading-none">
        <Slug
          value={mine}
          from={roll?.fromMine}
          direction={roll?.mine}
          className="text-verm-text"
        />
        <span aria-hidden className="h-[0.85em] w-[0.75px] bg-rule-min" />
        <Slug value={theirs} from={roll?.fromTheirs} direction={roll?.theirs} className="text-prus" />
      </span>

      {/*
       * The rule under the strip is also the rule at the head of the column: the
       * strip is pulled down onto the board, so this line lands exactly where
       * the first row of cells begins and the lead is printed on the column
       * itself rather than on a chip floating above it.
       */}
      <span
        aria-hidden
        className={cn('pointer-events-none absolute bottom-0', RULE[printed])}
      />
      {incoming && (
        <span
          key={incoming}
          aria-hidden
          className={cn('pointer-events-none absolute bottom-0', RULE[incoming])}
          style={{
            // From the new leader's side: your total is printed on the left of
            // the strip and theirs on the right, so the press runs out of the
            // half of the column that just won it.
            transformOrigin: ORIGIN[incoming],
            animation: 'press-wipe var(--t-move) var(--ease-settle)',
          }}
        />
      )}
    </div>
  );
}
