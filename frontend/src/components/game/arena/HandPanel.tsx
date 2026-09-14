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
 * Pinned to `--hand` so the board above can be sized against what is left; the
 * two heights are derived from the same variable and cannot drift apart.
 *
 * It is a well rather than a second panel. The cards are night with gilt frames,
 * so the tray they lie in has to be a step away from them in the other direction
 * — otherwise five framed cards sit on a surface of their own value and the hand
 * reads as a list rather than as cards put down somewhere.
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
      className="flex flex-col border-rule border-gold-deep bg-night-3 px-4 py-3"
      style={{ height: 'var(--hand)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        {/* Interpuncts, the way a lapidary inscription separates words. */}
        <span className="interpunct flex items-baseline">
          <span className="type-label text-parchment-2">Your hand</span>
          {/* A count is a number, so it is set in Spectral whatever it sits beside. */}
          <span className="type-num text-[11px] tracking-[0.08em] text-parchment-3">
            {cards.length} left
          </span>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn h-8 px-3"
            onClick={onPass}
            disabled={!isMyTurn || isFinished}
          >
            Pass turn
          </button>

          {awaitingOpponent ? (
            /*
             * Still a disabled button rather than a label, so the control does
             * not vanish from the tab order's shape while the answer is
             * outstanding. The mark loops because this genuinely is a wait on
             * somebody else, and it is struck in silver because the somebody
             * else is Luna.
             */
            <button type="button" className="btn btn--quiet h-8 px-3" disabled>
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 bg-luna"
                style={{ animation: 'ink-pulse 1.4s ease-in-out infinite' }}
              />
              Waiting on them
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--quiet h-8 px-3"
              onClick={onRequestEarlyEnd}
              disabled={!isMyTurn || isFinished || earlyEndBlocked}
            >
              End early
            </button>
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
