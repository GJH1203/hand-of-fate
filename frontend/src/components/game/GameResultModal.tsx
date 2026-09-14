'use client';

import React from 'react';

import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import type { ColumnScore } from '@/types/game';
import { OwnerMark } from './Pips';

type Outcome = 'win' | 'loss' | 'tie';

interface GameResultModalProps {
  open: boolean;
  outcome: Outcome;
  /** Column index to score, as the server calculated it. */
  columnScores: Record<number, ColumnScore>;
  players: Record<string, string>;
  currentPlayerId: string;
  columnsWon: Record<string, number>;
  onReturn: () => void;
}

/*
 * The verdict, cut into the tympanum. `.type-h1` is Marcellus and uppercases what
 * it sets, so these are written in sentence case and rendered as an inscription.
 * The old screen argued against capitals, and that argument was right for a banner
 * shouting at you; it does not apply to three words carved into the head of a
 * panel, which is what this is now.
 */
const HEADLINES: Record<Outcome, string> = {
  win: 'You won',
  loss: 'You lost',
  tie: 'A draw',
};

/*
 * The old subhead for a win read "Two columns of three. That is the match." — which
 * is a claim about the scoreline, and it is false whenever a win is 3–0 or 2–0 with
 * a column tied. These say only what the rules guarantee.
 */
const SUBHEADS: Record<Outcome, string> = {
  win: 'You took the most columns. The match is yours.',
  loss: 'They took the most columns.',
  tie: 'You each took the same number of columns.',
};

/** Columns are numbered the way the margin line numbers them. */

/** How the duel ends. Never `window.alert`, and never a banner you have to scroll to. */
export default function GameResultModal({
  open,
  outcome,
  columnScores,
  players,
  currentPlayerId,
  columnsWon,
  onReturn,
}: GameResultModalProps) {
  const theirId = Object.keys(players).find((id) => id !== currentPlayerId);
  const theirName = (theirId && players[theirId]) || 'your opponent';

  /*
   * The verdict is inscribed in the winner's metal: gold if it is yours, silver if
   * it is theirs, parchment if neither took it — a draw shows both metals together
   * beneath the words rather than inventing a third one for the occasion.
   *
   * The tympanum itself stays night. Gilding it would be the obvious move and it
   * is the wrong one twice over: gold is this system's budget, spent on the board
   * and one control; and since the metals are what say who won, a gold field under
   * "You lost" would contradict the sentence printed on it.
   */
  const verdictInk =
    outcome === 'win'
      ? 'text-gold-lit'
      : outcome === 'loss'
        ? 'text-luna-lit'
        : 'text-parchment';

  /*
   * Theirs at the head, yours at the foot — the same order the owner's mark takes
   * on a card, so the tally and the board can never contradict each other.
   */
  const tally = Object.entries(players).sort(
    ([a], [b]) => Number(a === currentPlayerId) - Number(b === currentPlayerId),
  );

  return (
    <Modal
      open={open}
      onClose={onReturn}
      showCloseButton={false}
      closeOnOverlayClick={false}
      widthClassName="max-w-[480px]"
      /* The panel is arched, and the field filling that arch is the tympanum. */
      className="overflow-hidden rounded-arch"
      contentClassName="px-0 pb-8 pt-0"
    >
      {/*
       * THE TYMPANUM. The arched head of the panel, with the result inscribed in
       * it: the winner's figure, the verdict, and a rule in their metal. Centred
       * and frontal, because that is how a verdict is set above a door.
       */}
      <div className="relative border-b-rule border-b-gold-deep bg-night-2 px-8 pb-7 pt-10 text-center">
        {/*
         * The winner stands in a niche, haloed. An arch marks something that
         * contains a figure, and this is the one figure the screen is about; the
         * halo is concentric drawn rings rather than a glow, because a nimbus in
         * an icon is struck metal and not a light source.
         *
         * A draw puts both figures in their own niches and haloes neither, which
         * is how a draw is said here — both metals together, never a third.
         */}
        {outcome === 'tie' ? (
          <span aria-hidden className="mb-7 flex items-end justify-center gap-4">
            <span className="flex h-14 w-12 items-center justify-center rounded-arch border-hair border-gold-deep bg-night-1">
              <OwnerMark mine className="h-7 w-7 text-gold" />
            </span>
            <span className="flex h-14 w-12 items-center justify-center rounded-arch border-hair border-luna-deep bg-night-1">
              <OwnerMark mine={false} className="h-7 w-7 text-luna" />
            </span>
          </span>
        ) : (
          <span
            aria-hidden
            className={cn(
              'relative mx-auto mb-7 flex h-14 w-12 items-center justify-center rounded-arch border-hair bg-night-1',
              outcome === 'win' ? 'border-gold' : 'border-luna-deep',
            )}
          >
            {/*
             * The rings are struck here rather than taken from `.aureole`, which
             * draws them in gold and only gold: a silver figure inside a gold
             * halo says the wrong thing about who took the match. Two solid
             * stops, the body then the recess — a ring at a lower opacity is not
             * a fainter ring, it is a grey one.
             */}
            <span
              className={cn(
                'pointer-events-none absolute inset-[-7px] rounded-arch border-hair',
                outcome === 'win' ? 'border-gold' : 'border-luna',
              )}
            />
            <span
              className={cn(
                'pointer-events-none absolute inset-[-13px] rounded-arch border-hair',
                outcome === 'win' ? 'border-gold-deep' : 'border-luna-deep',
              )}
            />
            <OwnerMark
              mine={outcome === 'win'}
              className={cn('h-7 w-7', outcome === 'win' ? 'text-gold' : 'text-luna')}
            />
          </span>
        )}

        <p className="type-micro text-parchment-3">Column by column</p>
        <h2 className={cn('type-h1 mt-2.5', verdictInk)}>{HEADLINES[outcome]}</h2>

        {outcome === 'tie' ? (
          <div aria-hidden className="mx-auto mt-4 w-28">
            <div className="h-px bg-gold" />
            <div className="mt-[3px] h-px bg-luna" />
          </div>
        ) : (
          <div
            aria-hidden
            className={cn(
              'mx-auto mt-4 h-[2px] w-28',
              outcome === 'win' ? 'bg-gold' : 'bg-luna',
            )}
          />
        )}

        <p className="type-body mx-auto mt-5 text-parchment-2">{SUBHEADS[outcome]}</p>
      </div>

      <div className="px-8">
        <p className="type-label mt-7 text-center text-parchment-3">The columns</p>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((columnIndex) => {
            const score = columnScores?.[columnIndex];
            const mine = score?.playerScores?.[currentPlayerId] ?? 0;
            const theirs = theirId ? (score?.playerScores?.[theirId] ?? 0) : 0;
            const leader =
              score?.isTie || !score?.winnerId
                ? 'none'
                : score.winnerId === currentPlayerId
                  ? 'me'
                  : 'them';

            const spoken =
              leader === 'me'
                ? `Column ${columnIndex + 1}: you ${mine}, ${theirName} ${theirs}. You take it.`
                : leader === 'them'
                  ? `Column ${columnIndex + 1}: you ${mine}, ${theirName} ${theirs}. ${theirName} takes it.`
                  : `Column ${columnIndex + 1}: you ${mine}, ${theirName} ${theirs}. Level, so nobody takes it.`;

            return (
              /*
               * A column reads exactly the way a card reads, at a third the size:
               * the owner's FIGURE first — a rayed disc for Sol, a crescent for
               * Luna — then its POSITION, at the foot if the column is yours and
               * the head if it is theirs, then the WEIGHT, since only your side is
               * framed twice, and only then the METAL. Gold against silver is
               * about 1.25:1 and could never carry this on its own. A level column
               * prints both figures and takes neither frame.
               */
              <div
                key={columnIndex}
                className={cn(
                  'relative overflow-hidden rounded-arch border-rule bg-night-2 px-2 pb-6 pt-7 text-center',
                  leader === 'me'
                    ? 'border-gold'
                    : leader === 'them'
                      ? 'border-luna-deep'
                      : 'border-gold-deep',
                )}
              >
                <span className="sr-only">{spoken}</span>

                <div aria-hidden>
                  {leader === 'me' && (
                    <span className="pointer-events-none absolute inset-[3px] rounded-arch border border-gold-deep" />
                  )}
                  {(leader === 'them' || leader === 'none') && (
                    <OwnerMark
                      mine={false}
                      className="pointer-events-none absolute left-1/2 top-1.5 h-3 w-3 -translate-x-1/2 text-luna"
                    />
                  )}
                  {(leader === 'me' || leader === 'none') && (
                    <OwnerMark
                      mine
                      className="pointer-events-none absolute bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 text-gold"
                    />
                  )}

                  <div className="type-micro text-parchment-3">
                    Col <span className="type-num">{columnIndex + 1}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-center gap-1.5">
                    <span className="type-num text-[1.375rem] leading-none text-gold-lit">
                      {mine}
                    </span>
                    <span className="type-num text-[0.6875rem] leading-none text-parchment-3">
                      :
                    </span>
                    <span className="type-num text-[1.375rem] leading-none text-luna-lit">
                      {theirs}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="type-label mt-7 text-center text-parchment-3">The tally</p>
        <ul className="mt-2.5 border-t-hair border-t-gold-deep">
          {tally.map(([playerId, name]) => {
            const isMe = playerId === currentPlayerId;
            const won = columnsWon?.[playerId] ?? 0;

            return (
              <li
                key={playerId}
                className="flex items-center justify-between gap-4 border-b-hair border-b-gold-deep py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {/* The owner's figure at swatch size — the same mark that stands
                      on every one of their cards, so the row and the pieces it is
                      counting are identified by the same thing. */}
                  <OwnerMark
                    mine={isMe}
                    className={cn('h-4 w-4 shrink-0', isMe ? 'text-gold' : 'text-luna')}
                  />
                  <span className="type-small truncate text-parchment">{name}</span>
                  {isMe && <span className="type-micro shrink-0 text-parchment-3">You</span>}
                </span>
                <span className="shrink-0 whitespace-nowrap">
                  <span className="type-num text-[0.9375rem] text-parchment">{won}</span>{' '}
                  <span className="type-micro text-parchment-3">
                    {won === 1 ? 'column' : 'columns'}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <button type="button" className="btn btn--key mt-8 h-11 w-full" onClick={onReturn}>
          Back to the menu
        </button>
      </div>
    </Modal>
  );
}
