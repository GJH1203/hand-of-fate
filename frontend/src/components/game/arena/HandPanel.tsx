import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import PlayerHand from '../PlayerHand';
import type { Card } from '@/types/game';

interface HandPanelProps {
  cards: Card[];
  selectedCard: Card | null;
  onSelect: (card: Card | null) => void;
  isMyTurn: boolean;
  isFinished: boolean;
  awaitingOpponent: boolean;
  earlyEndBlocked: boolean;
  onPass: () => void;
  onRequestEarlyEnd: () => void;
}

/**
 * The hand, and the two things you can do instead of playing a card.
 *
 * Pinned to `--hand` so the board above can be sized against what is left; the two
 * heights are derived from the same variable and cannot drift apart.
 */
export default function HandPanel({
  cards,
  selectedCard,
  onSelect,
  isMyTurn,
  isFinished,
  awaitingOpponent,
  earlyEndBlocked,
  onPass,
  onRequestEarlyEnd,
}: HandPanelProps) {
  return (
    <div
      className="flex flex-col rounded-lg border border-subtle bg-surface-1 px-4 py-3"
      style={{ height: 'var(--hand)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="type-micro text-ink-low">Your Mystical Hand</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={onPass} disabled={!isMyTurn || isFinished}>
            Pass Turn
          </Button>
          {awaitingOpponent ? (
            <Button variant="ghost" size="md" disabled>
              <Spinner size={16} />
              Awaiting opponent…
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="md"
              onClick={onRequestEarlyEnd}
              disabled={!isMyTurn || isFinished || earlyEndBlocked}
            >
              Request Early End
            </Button>
          )}
        </div>
      </div>

      <PlayerHand
        className="min-h-0 flex-1"
        cards={cards}
        isCurrentTurn={isMyTurn && !isFinished}
        selectedCard={selectedCard}
        onCardSelect={onSelect}
      />
    </div>
  );
}
