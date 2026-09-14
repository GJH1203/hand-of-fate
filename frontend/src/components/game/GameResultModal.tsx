'use client';

import React from 'react';

import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import type { ColumnScore } from '@/types/game';

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
 * Sentence case, not the shouted capitals the old screen used. A 36px serif saying
 * "You won" is already loud; setting it in caps as well only makes it harder to read.
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
const NUMERALS = ['I', 'II', 'III'];

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
   * The verdict is printed on the winner's plate: vermillion if it is yours,
   * prussian if it is theirs, the key plate alone if neither took it. `--verm`
   * only clears AA at 24px and up, and `.type-h1` is 36px, so this is the one
   * place vermillion is allowed to set text at full strength.
   */
  const verdictInk =
    outcome === 'win' ? 'text-verm' : outcome === 'loss' ? 'text-prus' : 'text-ink';

  /*
   * Theirs at the head, yours at the foot — the same order a card's band uses, so
   * the tally and the board can never contradict each other.
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
      contentClassName="px-8 pb-8 pt-7"
    >
      <p className="type-label text-ink-3">The result</p>
      <h2 className={cn('type-h1 mt-3', verdictInk)}>{HEADLINES[outcome]}</h2>

      {/*
       * A draw is not a third colour. It is both plates shown together — two
       * hairlines, one of each ink, which is exactly what a press would leave.
       */}
      {outcome === 'tie' ? (
        <div aria-hidden className="mt-4">
          <div className="h-[1.5px] bg-verm" />
          <div className="mt-[2px] h-[1.5px] bg-prus" />
        </div>
      ) : (
        <div
          aria-hidden
          className={cn('mt-4 h-[3px]', outcome === 'win' ? 'bg-verm' : 'bg-prus')}
        />
      )}

      <p className="type-body mt-4 text-ink-2">{SUBHEADS[outcome]}</p>

      <p className="type-label mt-8 text-ink-3">Columns</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
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
             * A column reads the way a card reads. Position first — the winner's
             * band is at the foot if it is yours and at the head if it is theirs —
             * then hatch direction, then the doubled rule that only your side
             * gets, then ink. Four channels, three of them surviving greyscale,
             * because vermillion against prussian is 1.64:1 and could never carry
             * this alone. A level column prints both bands.
             */
            <div
              key={columnIndex}
              className="relative overflow-hidden border-ink bg-paper-raised px-2 py-3.5 text-center"
              style={{ borderWidth: 'var(--rule)' }}
            >
              <span className="sr-only">{spoken}</span>

              <div aria-hidden>
                {(leader === 'them' || leader === 'none') && (
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1.5 hatch-theirs" />
                )}
                {(leader === 'me' || leader === 'none') && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 hatch-mine" />
                )}
                {leader === 'me' && (
                  <span className="pointer-events-none absolute inset-[3px] border border-ink" />
                )}

                <div className="type-micro text-ink-3">Column {NUMERALS[columnIndex]}</div>
                <div className="mt-2 flex items-baseline justify-center gap-1.5">
                  <span className="type-num text-[1.375rem] leading-none text-verm-text">
                    {mine}
                  </span>
                  <span className="type-num text-[0.6875rem] leading-none text-ink-3">:</span>
                  <span className="type-num text-[1.375rem] leading-none text-prus">
                    {theirs}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="type-label mt-8 text-ink-3">Tally</p>
      <ul className="mt-2 border-t-rule-ghost" style={{ borderTopWidth: 'var(--rule-hair)' }}>
        {tally.map(([playerId, name]) => {
          const isMe = playerId === currentPlayerId;
          const won = columnsWon?.[playerId] ?? 0;

          return (
            <li
              key={playerId}
              className="flex items-center justify-between gap-4 border-b-rule-ghost py-2.5"
              style={{ borderBottomWidth: 'var(--rule-hair)' }}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {/* The hatch, at swatch size: vertical is yours, horizontal theirs. */}
                <span
                  aria-hidden
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 border-ink',
                    isMe ? 'hatch-mine' : 'hatch-theirs',
                  )}
                  style={{ borderWidth: 'var(--rule-hair)' }}
                />
                <span className="type-small truncate text-ink">{name}</span>
                {isMe && <span className="type-micro shrink-0 text-ink-3">You</span>}
              </span>
              <span className="shrink-0 whitespace-nowrap">
                <span className="type-num text-[0.9375rem] text-ink">{won}</span>{' '}
                <span className="type-micro text-ink-3">
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
    </Modal>
  );
}
