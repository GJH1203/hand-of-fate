'use client';

import { type CSSProperties, Fragment, useEffect, useMemo, useState } from 'react';

import BoardCard from '@/components/game/BoardCard';
import Pips, { OwnerMark } from '@/components/game/Pips';
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
 * own pieces rather than with miniatures of them: `BoardCard` standing on a real
 * gilded field, the ghost impression of the stars you are about to lay down on the
 * one legal square, a sun at the foot of your cards and a moon at the head of
 * theirs. A player who finishes this has already read the real board for five
 * minutes.
 *
 * It is laid out on the centre line, and the order down that line is the arena's
 * own: what to do, then the board, then the hand you are holding. Nothing sits in a
 * sidebar, because a sidebar would put the board off the axis and this design does
 * not do that.
 */

interface GuidedTutorialProps {
  playerName: string;
  onComplete: () => void;
  onSkip: () => void;
}

/*
 * Every numeral is set in Spectral, including the ones inside a label — Marcellus
 * cuts titles and labels and never a number, and the labels here are full of them.
 * The script is authored as plain text so that editing what the tutorial says never
 * means editing markup; the digits are lifted out of it here, on the way to the
 * screen.
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
    <main id="main" className="mx-auto min-h-dvh w-full max-w-3xl px-0 sm:px-8 sm:py-10">
      <div className="panel relative min-h-dvh sm:min-h-0">
        {/*
         * The way out, held off the centre line rather than set on it: an
         * absolutely positioned control does not disturb the axis of the masthead,
         * and the masthead is the thing that has to be frontal.
         */}
        <button
          type="button"
          className="btn btn--quiet absolute right-3 top-3 h-9 px-3"
          onClick={onSkip}
        >
          Skip
        </button>

        {/*
         * The masthead. Title, and where you are in the duel.
         *
         * The top padding clears the Skip control rather than sharing a row with it:
         * a centred label and a right-hand button in the same band collide on a
         * narrow screen, and the label is the one that would lose.
         */}
        <div className="px-6 pb-7 pt-16 text-center sm:px-10 sm:pt-14">
          <p className="type-label text-gold">Guided duel</p>
          <h1 className="type-h1 mt-3 text-parchment">{step.title}</h1>
          <p className="type-micro mt-3 text-parchment-3">
            Step <span className="type-num">{index + 1}</span> of{' '}
            <span className="type-num">{STEPS.length}</span>
            <span aria-hidden className="mx-2 text-gold-deep">
              ·
            </span>
            {step.subtitle}
          </p>
        </div>

        {/*
         * The progress rule: a track in the deepest night with gold laid over as
         * much of it as has been read. It travels, so it takes the long duration;
         * it does not pulse, because the eternal does not fidget.
         */}
        <div aria-hidden className="h-[3px] w-full bg-night-3">
          <div
            className="h-full bg-gold transition-[width] duration-move ease-rise"
            style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-col items-center gap-9 px-6 py-9 sm:px-10 sm:py-10">
          {/* What to do. First, because it is the sentence the whole step turns on. */}
          <section className="w-full max-w-[54ch] text-center">
            <h2 className="type-label text-parchment-3">What to do</h2>
            <p aria-live="polite" className="type-body mx-auto mt-3 text-parchment">
              {numerals(message)}
            </p>

            {isThinking && (
              <p className="type-label mt-5 flex items-center justify-center gap-2 text-parchment-3">
                {/*
                 * The one loop the system allows, and only because the honest
                 * answer here is that we are still waiting.
                 */}
                <span
                  aria-hidden
                  className="inline-block h-[7px] w-[7px] shrink-0 bg-gold"
                  style={{ animation: 'ink-pulse 1.1s ease-in-out infinite' }}
                />
                Waiting for their answer
              </p>
            )}
          </section>

          {/* The board: the arcade of column heads, and the gilded field under it. */}
          <section className="w-fit">
            <h2 className="type-label mb-3 text-center text-parchment-3">The board</h2>

            {/* 232px is the board's own inner measure: three 72px squares and two 8px gaps. */}
            <div className="mx-auto grid w-[232px] grid-cols-3 gap-2">
              {totals.map((total) => (
                <div
                  key={total.col}
                  title={
                    total.leader
                      ? `Column ${total.col + 1} — ${total.leader === 'you' ? 'yours' : 'theirs'}, ${Math.max(total.mine, total.opponent)} to ${Math.min(total.mine, total.opponent)}`
                      : `Column ${total.col + 1} — level at ${total.mine}`
                  }
                  className={cn(
                    'flex h-[74px] flex-col items-center justify-between rounded-arch border-rule bg-night-2 py-1.5',
                    total.leader === 'you' && 'border-gold',
                    total.leader === 'opponent' && 'border-luna-deep',
                    !total.leader && 'border-gold-deep',
                  )}
                >
                  {/*
                   * The leader's figure, in the same place it sits on a card: a moon
                   * at the head when the column is theirs, a sun at the foot when it
                   * is yours. Both ends keep their eleven pixels whether or not a
                   * mark is standing in them, so the tally stays on the same line
                   * across all three heads and the mark can never crowd it.
                   *
                   * A level column carries no mark at all, which is a third state
                   * neither metal on its own could ever have shown.
                   */}
                  <span aria-hidden className="flex h-[11px] items-center">
                    {total.leader === 'opponent' && (
                      <OwnerMark mine={false} className="h-[11px] w-[11px] text-luna" />
                    )}
                  </span>

                  <span className="flex flex-col items-center gap-1">
                    <span className="type-micro leading-none text-parchment-3">
                      Col <span className="type-num">{total.col + 1}</span>
                    </span>
                    <span className="type-num flex items-baseline gap-1 text-[15px] leading-none">
                      <span
                        className={total.leader === 'you' ? 'text-gold-lit' : 'text-parchment-2'}
                      >
                        {total.mine}
                      </span>
                      <span className="text-parchment-3">:</span>
                      <span
                        className={
                          total.leader === 'opponent' ? 'text-luna-lit' : 'text-parchment-2'
                        }
                      >
                        {total.opponent}
                      </span>
                    </span>
                  </span>

                  <span aria-hidden className="flex h-[11px] items-center">
                    {total.leader === 'you' && (
                      <OwnerMark mine className="h-[11px] w-[11px] text-gold" />
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/*
             * The gilded field, and the only large passage of gold on this screen.
             * The fifteen squares are dark niches cut into it, exactly as they are
             * in the arena — a figure stands on uncreated light, and a tutorial that
             * stood its figures on anything else would teach the wrong board.
             */}
            <div className="gilt mt-2 border-rule border-gold-deep p-2.5">
              <div className="grid grid-cols-3 gap-2">
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
                             * uses: a ghost impression of the stars you are about to
                             * lay down, already counted, where they would land. Dark
                             * marks, because the ground under them is gold and gold
                             * carries dark marks only. It does not pulse — an
                             * altarpiece does not blink.
                             */
                            <Pips
                              power={selectedCard.power}
                              className="absolute left-1/2 top-1/2 w-[56%] -translate-x-1/2 -translate-y-1/2 text-ink-gold opacity-[0.34] transition-opacity duration-lume group-hover:opacity-[0.6]"
                            />
                          )
                        )}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          </section>

          {/* The count, directly under the board it is counting. */}
          <section className="text-center">
            <h2 className="type-label text-parchment-3">Columns held</h2>
            <div className="mt-3 flex items-center justify-center gap-6">
              {/*
               * The tally sits outside the cartouche on purpose: a cartouche is cut
               * in Marcellus and Marcellus never sets a number.
               */}
              <span className="flex items-baseline gap-2">
                <span className="cartouche cartouche--sol">
                  <OwnerMark mine className="h-3 w-3 text-gold" />
                  You
                </span>
                <span className="type-num text-[17px] text-gold-lit">{columnsWon}</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="cartouche cartouche--luna">
                  <OwnerMark mine={false} className="h-3 w-3 text-luna" />
                  Them
                </span>
                <span className="type-num text-[17px] text-luna-lit">{columnsLost}</span>
              </span>
            </div>
          </section>

          <section className="w-full text-center">
            {/*
             * The one heading here set in the serif rather than in Roman capitals:
             * the hand is the only thing on the page that belongs to the person
             * reading, and it is worth saying so in their own name.
             */}
            <h2 className="type-h3 truncate text-parchment">{playerName}&rsquo;s hand</h2>
            {hand.length === 0 ? (
              <p className="type-small mt-3 text-parchment-3">Your hand is empty.</p>
            ) : (
              // gap-5 rather than gap-3: a selected card wears an aureole that
              // stands twelve pixels proud of it, and the rings may not collide.
              <div className="mt-4 flex flex-wrap items-end justify-center gap-5">
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
                      aria-label={`${card.name}, power ${card.power}, yours`}
                      className={cn(
                        'relative flex h-[106px] w-[74px] flex-col items-center justify-center gap-2 pb-3',
                        'rounded-arch border-rule border-gold bg-night-1',
                        'transition-transform duration-move ease-rise',
                        selectable ? 'hover:-translate-y-1' : 'opacity-40',
                        // Picked up, and haloed: in this system attention is a
                        // nimbus of drawn rings, never a glow and never a shadow.
                        selected && 'aureole -translate-y-2',
                      )}
                    >
                      {/* Framed twice, the way your own cards are framed on the board. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-[3px] rounded-arch border border-gold-deep"
                      />
                      <Pips power={card.power} size={30} className="text-gold-lit" />
                      <span className="type-micro text-parchment-2">{card.name}</span>
                      {/* The sun, at the foot, where it will still be on the board. */}
                      <OwnerMark
                        mine
                        className="pointer-events-none absolute bottom-[6px] left-1/2 h-[10px] w-[10px] -translate-x-1/2 text-gold"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="w-full max-w-[54ch] border-t-hair border-gold-deep pt-6 text-center">
            <h2 className="type-label text-parchment-3">Hint</h2>
            <p className="type-small mx-auto mt-2 text-parchment-2">{numerals(step.tip)}</p>
          </section>

          <div className="flex w-full flex-wrap justify-center gap-3">
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
                className="btn h-11 px-5"
                onClick={() => handleAction('pass')}
              >
                Pass turn
              </button>
            )}
            {step.actions.includes('request-win') && (
              <button
                type="button"
                className="btn h-11 px-4"
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
    </main>
  );
}
