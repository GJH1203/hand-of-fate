import React, { useEffect, useRef, useState } from 'react';
import { Sparkle } from 'lucide-react';

import BoardCard from './BoardCard';
import { cn } from '@/lib/utils';
import type { Card, Position } from '@/types/game';

interface GameCellProps {
  card: Card | null;
  position: Position;
  isValidMove?: boolean;
  onCellClick?: (position: Position) => void;
  selectedCard?: Card | null;
  cardOwner?: string | null;
  currentPlayerId?: string;
  playerNames?: { [key: string]: string };
}

export default function GameCell({
  card,
  position,
  isValidMove = false,
  onCellClick,
  selectedCard,
  cardOwner,
  currentPlayerId,
  playerNames,
}: GameCellProps) {
  const [justLanded, setJustLanded] = useState(false);
  const hadCard = useRef(false);

  useEffect(() => {
    if (card && !hadCard.current) {
      setJustLanded(true);
      const timer = window.setTimeout(() => setJustLanded(false), 450);
      return () => window.clearTimeout(timer);
    }
    hadCard.current = !!card;
  }, [card]);

  const mine = cardOwner === currentPlayerId;
  const ownerName = cardOwner ? playerNames?.[cardOwner] : undefined;
  const playable = !card && isValidMove && !!selectedCard;

  const label = card
    ? `Column ${position.x + 1}, row ${position.y + 1}: ${mine ? 'your' : 'opponent'} ${card.name} ${card.power}`
    : `Column ${position.x + 1}, row ${position.y + 1}, empty${playable ? ', playable' : ''}`;

  return (
    <button
      type="button"
      onClick={() => playable && onCellClick?.(position)}
      disabled={!playable}
      aria-label={label}
      className={cn(
        'group relative aspect-square w-full overflow-hidden rounded-md border border-subtle bg-surface-1',
        'transition-[box-shadow,border-color] duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400',
        playable ? 'cell-valid cursor-pointer' : 'cursor-default',
        !card && !playable && 'disabled:cursor-default',
      )}
      style={justLanded ? { animation: 'card-land 450ms ease-out' } : undefined}
    >
      {card ? (
        <BoardCard card={card} mine={mine} ownerName={ownerName} />
      ) : (
        <>
          <Sparkle
            size={20}
            strokeWidth={1.5}
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/10"
          />
          {playable && selectedCard && (
            // The card you are about to play, shown where it would land.
            <div className="absolute inset-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <BoardCard card={selectedCard} mine ghost />
            </div>
          )}
        </>
      )}
    </button>
  );
}
