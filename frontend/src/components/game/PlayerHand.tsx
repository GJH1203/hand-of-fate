import React from 'react';

import Pips from './Pips';
import { cn } from '@/lib/utils';
import type { Card as GameCard } from '@/types/game';

/*
 * The hand is the one place the artwork survives.
 *
 * On the board a card is set type: reduced to a 48px square the raster is three
 * indistinguishable scratches, and the crop measured against the page at barely
 * more than 1:1. At 92×128 it is genuinely good, so it stays here — but it is
 * reconciled to the sheet rather than pasted onto it.
 *
 * `#plate-verm` below reduces the dark navy original to two inks: paper in the
 * highlights, vermillion in the shadows. The card stops being a photograph glued
 * to a sheet and becomes a plate printed on it, in the same ink as your pips and
 * your hatch. That is also why the hand needs no ownership band — every card in
 * it is yours, and it is printed in your plate to say so.
 */

interface PlayerHandProps {
  cards: GameCard[];
  isCurrentTurn: boolean;
  selectedCard: GameCard | null;
  onCardSelect: (card: GameCard | null) => void;
  className?: string;
}

/*
 * The duotone. Three stages, and the middle one is not optional.
 *
 * Luminance first, then a gamma of 1.8, then the two-entry transfer table that
 * maps black to --verm and white to --paper-raised. Without the gamma the
 * midtones of a dark photograph land halfway between the two table entries and
 * the whole card fogs over in a flat pink-grey that reads as a broken asset.
 * Pushing the midtones down first keeps the dark end dark and leaves the lifting
 * to the paper end, which is where a duotone is supposed to open up.
 */
function PlateFilter() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={0}
      height={0}
      style={{ position: 'absolute', width: 0, height: 0 }}
    >
      <filter id="plate-verm" colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"
        />
        <feComponentTransfer>
          <feFuncR type="gamma" exponent="1.8" />
          <feFuncG type="gamma" exponent="1.8" />
          <feFuncB type="gamma" exponent="1.8" />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.949 0.769" />
          <feFuncG type="table" tableValues="0.922 0.208" />
          <feFuncB type="table" tableValues="0.863 0.122" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
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
        <p className="type-small text-ink-3">Your hand is empty.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-end justify-center gap-3 transition-opacity duration-ink',
        !isCurrentTurn && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {/*
       * One filter for the whole hand, and the whole hand is where it ends: five
       * filtered elements is cheap, a filtered element per board square would
       * not be. Absolutely positioned so it is not a flex item and the row's gap
       * does not open around it.
       */}
      <PlateFilter />

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
              'transition-transform duration-move ease-settle',
              // A picked-up card comes off the table. Hover is the same gesture,
              // a third of the way — and it is dropped entirely while selected,
              // so pointing at the chosen card cannot pull it back down.
              selected ? '-translate-y-3.5' : 'hover:-translate-y-1.5',
            )}
          >
            <span
              /*
               * `isolate` is explicit and load-bearing. The artwork multiplies
               * into the card's own paper so the highlights read as stock rather
               * than as grey film; without a stacking context of its own that
               * multiply reaches through to the sheet and the whole hand muddies.
               * The transform here would create one as a side effect, which is
               * exactly the kind of thing that stops being true after an edit.
               */
              className={cn(
                'relative isolate block h-full w-full overflow-hidden',
                'rounded-card border-rule border-ink bg-paper-raised',
                'transition-transform duration-move ease-settle',
              )}
              /*
               * Lifting a card off a table straightens it. The rotation is
               * reduced rather than zeroed — a hand does not square anything
               * perfectly — and the rise above carries the rest of the gesture.
               */
              style={{ transform: `rotate(${(selected ? rest * 0.25 : rest).toFixed(2)}deg)` }}
            >
              {card.imageUrl && (
                /*
                 * No transition and no animation on this element, ever: a
                 * filtered element re-renders its filter chain every frame it is
                 * asked to change, and five of them will drop the hand to a
                 * crawl. The card travels; the plate printed on it does not move
                 * relative to the card.
                 */
                <img
                  src={card.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ filter: 'url(#plate-verm)', mixBlendMode: 'multiply' }}
                />
              )}

              {/*
               * Power is pips here too, printed in the key plate over the colour
               * plate — which is the order a press would lay them down in, and
               * the reason they stay legible over any part of any card's art.
               *
               * Sized rather than sized by class: given no `size`, Pips sets its
               * own width and height inline at 100%, and an inline width beats
               * any class you hand it.
               */}
              <Pips
                power={card.power}
                size={38}
                className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-ink"
              />

              {/*
               * The name, knocked out of the plate on its own slug at the foot.
               * Selecting inverts it to the key plate: a signal that is position
               * and value rather than hue, so it survives greyscale and says the
               * same thing the rise does.
               */}
              <span
                className={cn(
                  'type-label absolute inset-x-0 bottom-0 truncate border-t-hair border-ink px-1 py-[3px] text-center',
                  selected ? 'bg-ink text-paper-raised' : 'bg-paper-raised text-ink',
                )}
              >
                {card.name}
              </span>

              {/*
               * The second impression. A card you have chosen is printed twice,
               * in your ink — the same channel the board uses for a card that is
               * yours, which is what this card is about to become.
               */}
              {selected && (
                <span aria-hidden className="pointer-events-none absolute inset-[3px] border border-verm" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
