'use client';

import { type CSSProperties, Fragment, useEffect, useMemo, useState } from 'react';

import BoardCard from '@/components/game/BoardCard';
import Pips from '@/components/game/Pips';
import { layStyle } from '@/lib/game/lay';
import { cn } from '@/lib/utils';
import {
  type ActionKind,
  type SimCard,
  STEPS,
  columnTotals,
} from './guidedTutorialScript';

/*
 * The guided tutorial: a scripted duel you actually play, one instruction at a time.
 *
 * What it teaches is in `guidedTutorialScript.ts`; this drives it. The split is the
 * point — the script is three hundred lines of board positions and sentences, and it
 * used to sit on top of the component that plays it.
 *
 * This is the first screen a new player ever sees, so it is drawn with the arena's
 * own pieces rather than with miniatures of them: `BoardCard` on real `.cell`
 * squares, the ghost impression of the pips you are about to lay down on the one
 * legal square, the band at the foot for your cards and at the head for theirs. A
 * player who finishes this has already read the real board for five minutes.
 */

interface GuidedTutorialProps {
  playerName: string;
  onComplete: () => void;
  onSkip: () => void;
}

/*
 * Every numeral is set in the mono, including the ones inside a sentence — the type
 * rule has no exception for prose. The script is authored as plain text so that
 * editing what the tutorial says never means editing markup; the digits are lifted
 * out of it here, on the way to the screen.
 */
function numerals(text: string) {
  return text.split(/(\d+)/).map((part, index) =>
    /^\d+$/.test(part) ? (
      <span key={index} className="type-num">
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export default function GuidedTutorial({ playerName, onComplete, onSkip }: GuidedTutorialProps) {
  const [index, setIndex] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, SimCard>>({});
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const step = STEPS[index];

  useEffect(() => {
    setMessage(step.instruction);
    setSelectedCardId(null);
    setPlaced({});
  }, [index, step.instruction]);

  // The scripted board plus whatever the player has just put down on this step.
  const grid = useMemo(() => {
    const next = step.grid.map((row) => [...row]);
    Object.entries(placed).forEach(([key, card]) => {
      const [row, col] = key.split(',').map(Number);
      next[row][col] = card;
    });
    return next;
  }, [step.grid, placed]);

  const hand = step.hand.filter((card) => !Object.values(placed).some((c) => c.id === card.id));
  const selectedCard = hand.find((card) => card.id === selectedCardId) ?? null;
  const totals = columnTotals(grid);
  const columnsWon = totals.filter((t) => t.leader === 'you').length;
  const columnsLost = totals.filter((t) => t.leader === 'opponent').length;

  const advance = (delay = 1200) => {
    window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, STEPS.length - 1));
    }, delay);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!step.expect || selectedCardId !== step.expect.cardId) return;
    if (step.expect.cell !== `${row},${col}`) return;

    const card = hand.find((c) => c.id === selectedCardId);
    if (!card) return;

    setPlaced((current) => ({ ...current, [`${row},${col}`]: card }));
    setSelectedCardId(null);
    advance();
  };

  const handleAction = (action: ActionKind) => {
    if (action === 'complete') {
      onComplete();
      return;
    }
    if (action === 'pass') {
      setMessage('A card held back is a column you can still take.');
      advance(1400);
      return;
    }
    if (action === 'request-win') {
      setMessage('You have asked to end the duel early. They are deciding.');
      setIsThinking(true);
      window.setTimeout(() => {
        setIsThinking(false);
        advance(200);
      }, 1800);
      return;
    }
    advance(400);
  };

  return (
    <main id="main" className="mx-auto min-h-dvh w-full max-w-5xl px-0 sm:px-8 sm:py-10">
      <div className="sheet min-h-dvh sm:min-h-0">
        {/* The masthead. Title, where you are, and the way out. */}
        <div className="flex items-start justify-between gap-6 px-6 py-6 sm:px-10 sm:py-8">
          <div className="min-w-0">
            <p className="type-label text-verm-text">Guided duel</p>
            <h1 className="type-h1 mt-2 text-ink">{step.title}</h1>
            <p className="type-micro mt-2 text-ink-3">
              Step {index + 1} of {STEPS.length} — {step.subtitle}
            </p>
          </div>
          <button type="button" className="btn btn--quiet h-9 shrink-0 px-3" onClick={onSkip}>
            Skip
          </button>
        </div>

        {/*
         * The progress rule: a track in the deepest paper with the vermillion plate
         * laid over as much of it as has been read. It travels, so it takes the long
         * duration; it does not pulse, because a printed sheet is still.
         */}
        <div aria-hidden className="h-[3px] w-full bg-paper-deep">
          <div
            className="h-full bg-verm transition-[width] duration-move ease-settle"
            style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
          {/* The board. Narrow and fixed; the notes beside it take the rest. */}
          <section className="mx-auto w-fit lg:mx-0">
            <h2 className="type-label mb-3 text-ink-3">The board</h2>

            <div className="grid grid-cols-3 gap-2">
              {totals.map((total) => (
                <div
                  key={total.col}
                  title={
                    total.leader
                      ? `Column ${total.col + 1} — ${total.leader === 'you' ? 'yours' : 'theirs'}, ${Math.max(total.mine, total.opponent)} to ${Math.min(total.mine, total.opponent)}`
                      : `Column ${total.col + 1} — level at ${total.mine}`
                  }
                  className="relative flex h-12 w-[72px] flex-col items-center justify-center border-rule border-ink bg-paper-sunk"
                >
                  {/*
                   * The leader's band, in the same place it sits on a card: at the
                   * foot when the column is yours, at the head when it is theirs. A
                   * level column has no band at all, which is a third state the ink
                   * on its own could never have shown.
                   */}
                  {total.leader && (
                    <span
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute inset-x-0 h-[6px]',
                        total.leader === 'you' ? 'bottom-0 hatch-mine' : 'top-0 hatch-theirs',
                      )}
                    />
                  )}
                  <span className="type-micro leading-none text-ink-3">Col {total.col + 1}</span>
                  <span className="type-num mt-1 flex items-baseline gap-1 text-[15px] leading-none">
                    <span className={total.leader === 'you' ? 'text-verm-text' : 'text-ink-2'}>
                      {total.mine}
                    </span>
                    <span className="text-ink-3">:</span>
                    <span className={total.leader === 'opponent' ? 'text-prus' : 'text-ink-2'}>
                      {total.opponent}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {grid.map((row, rowIndex) =>
                row.map((card, colIndex) => {
                  const key = `${rowIndex},${colIndex}`;
                  const isTarget =
                    !!step.expect &&
                    step.expect.cell === key &&
                    selectedCardId === step.expect.cardId &&
                    !card;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      disabled={!isTarget}
                      aria-label={
                        card
                          ? `Column ${colIndex + 1}, row ${rowIndex + 1}: ${card.owner === 'you' ? 'your' : 'their'} ${card.name}, power ${card.power}`
                          : `Column ${colIndex + 1}, row ${rowIndex + 1}, empty${
                              isTarget && selectedCard
                                ? `, playable — would place ${selectedCard.name}, power ${selectedCard.power}`
                                : ''
                            }`
                      }
                      className={cn(
                        'group relative h-[72px] w-[72px] cell',
                        isTarget && 'cell--playable',
                        !isTarget && 'cursor-default',
                      )}
                    >
                      {card ? (
                        /*
                         * `.laid` rotates the card a fraction of a degree, derived
                         * from this square's coordinates, exactly as the real board
                         * does. The wrapper rotates and the button does not, so the
                         * hit target stays square to the grid.
                         */
                        <span
                          className="laid absolute inset-0 block"
                          // The lay is three custom properties; CSSProperties has no
                          // room for them in its index signature, and `.laid` reads them.
                          style={layStyle(colIndex, rowIndex) as CSSProperties}
                        >
                          <BoardCard
                            card={{ id: card.id, name: card.name, power: card.power }}
                            mine={card.owner === 'you'}
                          />
                        </span>
                      ) : (
                        isTarget &&
                        selectedCard && (
                          /*
                           * The legal-move affordance, and the same one the arena
                           * uses: a ghost impression of the pips you are about to
                           * lay down, already counted, where they would land. It
                           * replaces a pulsing glow — glow does not exist on paper,
                           * and this teaches the mark the real board will show.
                           */
                          <Pips
                            power={selectedCard.power}
                            className="absolute left-1/2 top-1/2 w-[64%] -translate-x-1/2 -translate-y-1/2 text-verm opacity-[0.42] transition-opacity duration-ink group-hover:opacity-[0.72]"
                          />
                        )
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </section>

          {/* The notes: what to do, what you are holding, where the count stands. */}
          <div className="lg:border-l-hair lg:border-rule-ghost lg:pl-12">
            <section>
              <h2 className="type-label text-ink-3">What to do</h2>
              <p aria-live="polite" className="type-body mt-3 text-ink">
                {numerals(message)}
              </p>

              {isThinking && (
                <p className="type-label mt-4 flex items-center gap-2 text-ink-3">
                  {/*
                   * The one loop the system allows, and only because the honest
                   * answer here is that we are still waiting.
                   */}
                  <span
                    aria-hidden
                    className="inline-block h-[7px] w-[7px] shrink-0 bg-verm"
                    style={{ animation: 'ink-pulse 1.1s ease-in-out infinite' }}
                  />
                  Waiting for their answer
                </p>
              )}

              <div className="mt-5 border-l-rule border-rule-ghost pl-4">
                <p className="type-label text-ink-3">Hint</p>
                <p className="type-small mt-1.5 text-ink-2">{numerals(step.tip)}</p>
              </div>
            </section>

            <section className="mt-8">
              {/*
               * The one section head on the page set in the serif rather than the
               * mono label: the hand is the only thing here that belongs to the
               * person reading, and it is worth saying so in their own name.
               */}
              <h2 className="type-h3 truncate text-ink">{playerName}&rsquo;s hand</h2>
              {hand.length === 0 ? (
                <p className="type-small mt-3 text-ink-3">Your hand is empty.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-3">
                  {hand.map((card) => {
                    const wanted = step.expect?.cardId === card.id;
                    const selectable = step.actions.includes('place') && (!step.expect || wanted);
                    const selected = selectedCardId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        disabled={!selectable}
                        onClick={() => setSelectedCardId(selected ? null : card.id)}
                        aria-pressed={selected}
                        aria-label={`${card.name}, power ${card.power}`}
                        className={cn(
                          'relative flex h-[104px] w-[74px] flex-col items-center justify-center gap-2 pb-2',
                          'border-rule border-ink rounded-card bg-paper-raised',
                          'transition-transform duration-move ease-settle',
                          selectable ? 'hover:-translate-y-1' : 'opacity-40',
                          // Picked up, and printed a second time around the edge, so
                          // the state survives without motion and without a glow.
                          selected &&
                            '-translate-y-2 outline outline-2 outline-offset-[3px] outline-ink',
                        )}
                      >
                        {/* Yours is printed twice: the inner rule is the second impression. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-[3px] border border-ink"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-[8px] hatch-mine"
                        />
                        <Pips power={card.power} size={32} className="text-verm" />
                        <span className="type-micro text-ink-2">{card.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h2 className="type-label text-ink-3">Columns held</h2>
              <div className="mt-3 flex items-center gap-3">
                <span className="stamp stamp--mine">
                  You <span className="type-num">{columnsWon}</span>
                </span>
                <span className="stamp stamp--theirs">
                  Them <span className="type-num">{columnsLost}</span>
                </span>
              </div>
            </section>

            <div className="mt-8 flex flex-wrap gap-3 border-t-hair border-rule-ghost pt-6">
              {step.actions.includes('continue') && (
                <button
                  type="button"
                  className="btn btn--key h-11 px-5"
                  onClick={() => handleAction('continue')}
                >
                  Continue
                </button>
              )}
              {step.actions.includes('pass') && (
                <button
                  type="button"
                  className="btn btn--rule h-11 px-5"
                  onClick={() => handleAction('pass')}
                >
                  Pass turn
                </button>
              )}
              {step.actions.includes('request-win') && (
                <button
                  type="button"
                  className="btn btn--quiet h-11 px-4"
                  onClick={() => handleAction('request-win')}
                >
                  Ask to end early
                </button>
              )}
              {step.actions.includes('complete') && (
                <button
                  type="button"
                  className="btn btn--key h-11 px-5"
                  onClick={() => handleAction('complete')}
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
