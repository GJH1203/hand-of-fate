import React from 'react';

import Pips, { OwnerMark } from './Pips';
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
 * A card once it is on the board: a small arched panel standing on the gilded
 * field, the way a figure stands on the gold ground of an icon.
 *
 * It carries no artwork. That sounds like a loss and is the opposite — measured
 * against the old page the board crop was 1.16:1, so a placed card and an empty
 * square were the same value separated by one hairline, and reduced to board
 * size the three illustrations are indistinguishable scratches. The artwork
 * stays in the hand where it is 128px tall and genuinely good; the board is
 * drawn.
 *
 * OWNERSHIP IS FOUR CHANNELS AND THE FIRST OF THEM IS A SHAPE.
 *
 *   figure   a rayed disc for Sol, a crescent for Luna. A sun is not a moon in
 *            greyscale, at 48px, in a photograph of a screen, or under any form
 *            of colour blindness. This is the channel that carries the meaning.
 *   position the mark sits at the FOOT of your cards and the HEAD of theirs, so
 *            a glance down a column reads as a rhythm before anything is
 *            identified.
 *   weight   yours is framed twice — a gilt rule and an inner keyline. Theirs is
 *            framed once. Survives forced-colors, where border-style is kept.
 *   metal    gold against silver, and it is LAST. The two measure about 1.25:1
 *            against each other, which is even closer than the vermillion and
 *            prussian this replaces. Metal is the confirmation, never the cue.
 */
export default function BoardCard({ card, mine, ownerName, ghost }: BoardCardProps) {
  const label = `${card.name}, power ${card.power}, ${mine ? 'yours' : ownerName ?? 'your opponent'}`;

  return (
    <div
      title={label}
      aria-label={label}
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center overflow-hidden',
        'rounded-arch border-rule bg-night-1',
        mine ? 'border-gold' : 'border-luna-deep',
        ghost && 'opacity-40',
      )}
    >
      {/* Framed twice if it is yours: the inner keyline is the second pass. */}
      {mine && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[3px] rounded-arch border border-gold-deep"
        />
      )}

      <Pips
        power={card.power}
        className={cn(
          'w-[58%] translate-y-[var(--pip-shift)]',
          mine ? '[--pip-shift:-6%] text-gold-lit' : '[--pip-shift:6%] text-luna-lit',
        )}
      />

      {/*
       * The owner's figure, at the foot for Sol and the head for Luna. It never
       * overlaps the stars, so the count and the owner can always both be read.
       */}
      <OwnerMark
        mine={mine}
        className={cn(
          'pointer-events-none absolute left-1/2 h-[15%] max-h-[13px] min-h-[8px] w-auto -translate-x-1/2 aspect-square',
          mine ? 'bottom-[5%] text-gold' : 'top-[5%] text-luna',
        )}
      />
    </div>
  );
}
