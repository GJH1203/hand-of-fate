import React from 'react';
import Image from 'next/image';

import Pips from './Pips';
import { cn } from '@/lib/utils';
import type { Card as GameCard } from '@/types/game';

/*
 * The hand is the one place the artwork survives.
 *
 * On the board a card is drawn rather than illustrated: reduced to a 48px square
 * the raster is three indistinguishable scratches, so `BoardCard` sets it as a
 * figure in a niche instead. At 92×128 the art is genuinely good, and this is
 * the first design it has not had to be argued with — the cards are dark navy
 * with gold keylines, serif capitals and big numerals, which is this system's
 * own night and this system's own gold. So it is shown as drawn.
 *
 * The duotone filter that used to reconcile it with a bone-paper sheet is gone,
 * and with it the multiply blend and the isolated stacking context that existed
 * only to support the filter. Reducing a picture to two inks was the right
 * answer to paper and the wrong answer to a night ground: it threw away the one
 * thing the art and the interface now have in common.
 *
 * Every card in the hand is yours, so nothing here carries an ownership mark.
 * The frames are gilt throughout and Sol's stars count the power.
 *
 * A CHOSEN CARD IS MARKED THREE WAYS AND NONE OF THEM IS A SECOND FRAME: it rises
 * off the table, it takes an aureole, and its name slug is gilded. It used to be
 * framed twice as well, borrowing the inner keyline from the board — but there the
 * keyline is an ownership channel and means "this card is Sol's", which is the one
 * thing it has to go on meaning. Three channels for selection is already one more
 * than this needed.
 */

interface PlayerHandProps {
  cards: GameCard[];
  isCurrentTurn: boolean;
  selectedCard: GameCard | null;
  onCardSelect: (card: GameCard | null) => void;
  className?: string;
}

/*
 * A held card is never square to the table. Each one keeps a fraction of a
 * degree of its own, derived from the card's id rather than drawn at random —
 * the same reason `lib/game/lay.ts` gives for the board: Math.random would
 * differ between the server render and the client one and React would tear the
 * tree down over the mismatch. Deriving it from the id rather than from the
 * card's place in the row also means a card keeps its own lie as the hand
 * closes up around a played one.
 */
const MAX_HAND_ROTATION_DEG = 1.6;

function restRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ((hash % 1000) / 1000 - 0.5) * 2 * MAX_HAND_ROTATION_DEG;
}

export default function PlayerHand({
  cards,
  isCurrentTurn,
  selectedCard,
  onCardSelect,
  className,
}: PlayerHandProps) {
  const toggle = (card: GameCard) => {
    if (!isCurrentTurn) return;
    onCardSelect(selectedCard?.id === card.id ? null : card);
  };

  if (!Array.isArray(cards) || cards.length === 0) {
    return (
      <div className={cn('flex h-[128px] items-center justify-center', className)}>
        <p className="type-small text-parchment-3">Your hand is empty.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 transition-opacity duration-lume',
        !isCurrentTurn && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {cards.map((card) => {
        const selected = selectedCard?.id === card.id;
        const rest = restRotation(card.id);

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => toggle(card)}
            aria-pressed={selected}
            aria-label={`${card.name}, power ${card.power}`}
            title={`${card.name} · power ${card.power}`}
            className={cn(
              'block h-[128px] w-[92px] shrink-0',
              'transition-transform duration-move ease-rise',
              // A chosen card comes off the table. Hover is the same gesture, a
              // third of the way — and it is dropped entirely while selected, so
              // pointing at the chosen card cannot pull it back down.
              selected ? '-translate-y-3.5' : 'hover:-translate-y-1.5',
            )}
          >
            <span
              /*
               * The rotation and the aureole live on this wrapper rather than on
               * the card face below it, because the face is clipped: rings drawn
               * outside a box with `overflow:hidden` are rings nobody sees. The
               * wrapper turns with the card, so the nimbus stays square to it.
               */
              className={cn(
                'relative block h-full w-full rounded-arch',
                'transition-transform duration-move ease-rise',
                selected && 'aureole',
              )}
              /*
               * Lifting a card off a table straightens it. The rotation is
               * reduced rather than zeroed — a hand does not square anything
               * perfectly — and the rise above carries the rest of the gesture.
               */
              style={{ transform: `rotate(${(selected ? rest * 0.25 : rest).toFixed(2)}deg)` }}
            >
              <span
                className={cn(
                  'relative block h-full w-full overflow-hidden',
                  'rounded-arch border-rule bg-night-1',
                  'transition-colors duration-lume',
                  selected ? 'border-gold' : 'border-gold-deep',
                )}
              >
                {card.imageUrl && (
                  /*
                   * next/image, not a bare <img>, and this is a payload decision
                   * rather than a stylistic one: the three card faces are 2.1,
                   * 2.5 and 2.6 MB of PNG, so a raw tag pulled 7.2 MB down to
                   * draw them at 92x128. Next resizes and re-encodes them at
                   * build time and serves whichever of those a browser can take.
                   * The sign-in screen was already doing this; the arena, where
                   * it matters far more, was not.
                   */
                  <Image
                    src={card.imageUrl}
                    alt=""
                    width={184}
                    height={256}
                    sizes="128px"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                {/*
                 * Power is counted stars here too, over the art rather than in
                 * place of it — the hand is where you compare what you are
                 * holding, and comparing counts is faster than reading numerals.
                 *
                 * Given a `size`, Pips sets its width and height as attributes;
                 * given none it fills its box and an inline width would beat any
                 * class handed to it. The fixed size is what this needs.
                 */}
                <Pips
                  power={card.power}
                  size={38}
                  className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 text-gold-lit"
                />

                {/*
                 * The name, on its own slug at the foot. Choosing a card gilds
                 * the slug: a signal carried by position and value rather than
                 * hue, so it survives greyscale and says the same thing the rise
                 * and the nimbus do.
                 */}
                <span
                  className={cn(
                    'type-micro absolute inset-x-0 bottom-0 truncate border-t-hair px-1 py-[4px] text-center',
                    'transition-colors duration-lume',
                    selected
                      ? 'border-gold bg-gold-ground text-ink-gold'
                      : 'border-gold-deep bg-night-1 text-parchment-2',
                  )}
                >
                  {card.name}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
