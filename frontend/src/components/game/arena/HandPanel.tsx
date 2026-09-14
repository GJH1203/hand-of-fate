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
 *
 * It is a ruled tray sunk into the sheet rather than another panel: the cards are
 * on paper-raised, so the tray has to be a step down from the sheet for them to
 * look like they are lying in it.
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
      className="flex flex-col border-rule border-ink bg-paper-sunk px-4 py-3"
      style={{ height: 'var(--hand)' }}
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="flex items-baseline gap-2.5">
          <span className="type-label text-ink-2">Your hand</span>
          {/* A count is a number, so it is set in the mono whatever it sits beside. */}
          <span className="type-num text-[11px] tracking-[0.08em] text-ink-3">
            {cards.length} left
          </span>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn--rule h-8 px-3"
            onClick={onPass}
            disabled={!isMyTurn || isFinished}
          >
            Pass turn
          </button>

          {awaitingOpponent ? (
            /*
             * Still a disabled button rather than a label, so the control does not
             * vanish from the tab order's shape while the answer is outstanding.
             * The mark loops because this genuinely is a wait on somebody else.
             */
            <button type="button" className="btn btn--quiet h-8 px-3" disabled>
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 bg-ochre"
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
