import React, { useEffect, useRef, useState } from 'react';

import BoardCard from './BoardCard';
import Pips from './Pips';
import { layStyle } from '@/lib/game/lay';
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
      const timer = window.setTimeout(() => setJustLanded(false), 320);
      return () => window.clearTimeout(timer);
    }
    hadCard.current = !!card;
  }, [card]);

  const mine = cardOwner === currentPlayerId;
  const ownerName = cardOwner ? playerNames?.[cardOwner] : undefined;
  const playable = !card && isValidMove && !!selectedCard;

  const label = card
    ? `Column ${position.x + 1}, row ${position.y + 1}: ${mine ? 'your' : 'opponent'} ${card.name}, power ${card.power}`
    : `Column ${position.x + 1}, row ${position.y + 1}, empty${
        playable && selectedCard ? `, playable — would place ${selectedCard.name}, power ${selectedCard.power}` : ''
      }`;

  return (
    <button
      type="button"
      onClick={() => playable && onCellClick?.(position)}
      disabled={!playable}
      aria-label={label}
      className={cn(
        'group relative aspect-square w-full cell',
        playable && 'cell--playable',
        !playable && 'cursor-default',
      )}
    >
      {card ? (
        /*
         * `.laid` applies a rotation and offset derived from this square's
         * coordinates, so the card sits a fraction of a degree off true. The
         * wrapper rotates; the button does not, so the hit target stays exactly
         * on the grid.
         */
        <span
          className="laid absolute inset-0 block"
          style={{
            ...layStyle(position.x, position.y),
            animation: justLanded ? 'card-settle 260ms cubic-bezier(0.2,0.9,0.25,1)' : undefined,
          }}
        >
          <BoardCard card={card} mine={mine} ownerName={ownerName} />
        </span>
      ) : (
        playable &&
        selectedCard && (
          /*
           * The legal-move affordance: a ghost impression of the pips you are
           * about to lay down, so you see what you would place, where, already
           * counted. It replaces an infinitely pulsing inset glow — glow does
           * not exist on paper, and eight squares breathing forever was the most
           * recognisable tic in the stylesheet this design replaces.
           *
           * It does not animate. A printed sheet does not throb. Hover only
           * deepens the ink, which is what pressing harder would do.
           */
          <Pips
            power={selectedCard.power}
            className="absolute left-1/2 top-1/2 w-[64%] -translate-x-1/2 -translate-y-1/2 text-verm opacity-[0.42] transition-opacity duration-ink group-hover:opacity-[0.72]"
          />
        )
      )}
    </button>
  );
}
