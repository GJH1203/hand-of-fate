import React from 'react';

import Pips from './Pips';
import { cn } from '@/lib/utils';
import type { Card } from '@/types/game';

interface BoardCardProps {
  card: Card;
  mine: boolean;
  ownerName?: string;
  /** Half-strength preview of the card about to be played into an empty cell. */
  ghost?: boolean;
}

/**
 * A card once it is on the board. It carries no artwork at all.
 *
 * That sounds like a loss and is the opposite. The raster was measured against
 * the page at 1.16:1 to 1.23:1 — a placed card and an empty square were the same
 * value, separated by one hairline — and on paper the same crop is a 13:1 black
 * rectangle. Reduced to board size it is worse than useless: at 48px the three
 * cards are indistinguishable scratches. So the artwork stays in the hand, where
 * it is 128px tall and genuinely good, and the board is set type.
 *
 * OWNERSHIP IS FOUR CHANNELS AND ONLY ONE OF THEM IS COLOUR, because vermillion
 * against prussian measures 1.64:1 and could never have carried it alone:
 *
 *   position   your band is at the FOOT, theirs at the HEAD. Survives greyscale,
 *              every kind of colour blindness, 48px, and a photograph of a
 *              screen. This is the primary channel and must never be traded away.
 *   hatch      yours runs vertical, theirs horizontal — Petra Sancta's 1638
 *              heraldic convention, where gules is vertical and azure is
 *              horizontal. It is orthogonal to hue and luminance, and it is not
 *              an accessibility retrofit bolted onto a historical style; it IS
 *              the historical style, and it happens to be the right engineering.
 *   rule       yours is printed twice — a keyline plus an inner rule. Theirs is
 *              a single keyline. Survives forced-colors, where background-image
 *              is dropped but border-style is not.
 *   ink        vermillion against prussian. The weakest of the four, and last.
 *
 * The band never overlaps the pips, so no amount of plate offset can eat the
 * ownership signal.
 */
export default function BoardCard({ card, mine, ownerName, ghost }: BoardCardProps) {
  const label = `${card.name}, power ${card.power}${ownerName ? `, ${ownerName}` : ''}`;

  return (
    <div
      title={label}
      aria-label={label}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-paper-raised',
        'border-rule border-ink rounded-card',
        ghost && 'opacity-40',
      )}
    >
      {/* Yours is printed twice: the inner rule is the second impression. */}
      {mine && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[3px] border border-ink"
        />
      )}

      {/*
       * The band. Height is a percentage of the cell rather than a pixel value
       * so it survives the full 48px-to-112px range without a media query, with
       * a floor so it cannot thin to nothing on the smallest board.
       */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 h-[11%] min-h-[6px]',
          mine ? 'bottom-0 hatch-mine' : 'top-0 hatch-theirs',
        )}
      />

      <Pips
        power={card.power}
        className={cn(
          // 72% of the cell, nudged clear of the owner's band.
          'w-[72%] translate-y-[var(--pip-shift)]',
          mine ? '[--pip-shift:-4%]' : '[--pip-shift:4%]',
          mine ? 'text-verm' : 'text-prus',
        )}
      />
    </div>
  );
}
