import React from 'react';

import { cn } from '@/lib/utils';
import type { Card } from '@/types/game';

interface BoardCardProps {
  card: Card;
  mine: boolean;
  ownerName?: string;
  /** Half-transparent preview of the card about to be played into an empty cell. */
  ghost?: boolean;
}

/**
 * A card once it is on the board.
 *
 * It is deliberately the same object as the one in your hand — a dark face, the art,
 * a thin metal edge — rather than the bare artwork it used to be. Ownership is the
 * edge colour and nothing else: the blue "YOU" pill and the truncated name plate
 * covered the art, overflowed into the row above, and said in two places what one
 * border says better. The legend in the top bar explains the two colours once.
 */
export default function BoardCard({ card, mine, ownerName, ghost }: BoardCardProps) {
  const label = `${card.name}, power ${card.power}${ownerName ? `, ${ownerName}` : ''}`;

  return (
    <div
      title={label}
      aria-label={label}
      className={cn(
        'relative h-full w-full overflow-hidden rounded-[7px] border bg-surface-0',
        mine ? 'border-gold-400/80' : 'border-danger/70',
        ghost && 'opacity-45',
      )}
    >
      {card.imageUrl && (
        // Cropped to the illustration. Centring the crop would keep the card's own
        // printed name and number in frame, which then competes with the sigil below —
        // two numbers on one card, one of them half cut off.
        <img
          src={card.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[50%_78%]"
        />
      )}

      {/* Darkens the top strip so the power sigil stays readable over any art */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/60 to-transparent" />

      <span
        className={cn(
          'absolute left-1 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full font-display text-[14px] font-bold leading-none tabular',
          mine ? 'bg-gold-400 text-[#1A1206]' : 'bg-danger text-white',
        )}
      >
        {card.power}
      </span>
    </div>
  );
}
