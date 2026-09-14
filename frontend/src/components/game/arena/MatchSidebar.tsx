import type { ReactNode } from 'react';

import { BOARD_HEIGHT, BOARD_WIDTH } from '@/lib/game/board';
import { readableState } from '@/lib/game/matchView';
import { cn } from '@/lib/utils';
import type { GameState } from '@/types/game';

interface MatchSidebarProps {
  gameState: GameState;
  players: Record<string, string>;
  currentPlayerId: string;
  opponentConnected: boolean;
  battleLog: string[];
  error: string | null;
}

const CELLS = BOARD_WIDTH * BOARD_HEIGHT;

/** A section head: mono caps over a heavy rule, the way a ledger column is titled. */
function SlipHead({ children }: { children: ReactNode }) {
  return <h2 className="type-label border-b-heavy border-ink pb-1.5">{children}</h2>;
}

/** Label left, figure right, hairline under. Every figure is mono and tabular. */
function TallyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-hair border-ink py-1.5">
      <dt className="type-label text-ink-3">{label}</dt>
      <dd className="type-num text-[13px] text-ink">{value}</dd>
    </div>
  );
}

/**
 * The player's mark: a ruled square carrying their initial, banded like one of
 * their cards — at the foot for you, at the head for them, and printed twice if
 * it is yours. The same three channels as the board, at a twelfth the size, so
 * the row and the pieces it is counting are read the same way.
 */
function PlayerMark({ initial, mine }: { initial: string; mine: boolean }) {
  return (
    <span
      aria-hidden
      className="relative flex h-8 w-7 shrink-0 items-center justify-center rounded-card border-rule border-ink bg-paper-raised"
    >
      {mine && <span className="absolute inset-[2px] border border-ink" />}
      <span className="type-num text-[13px] leading-none">{initial}</span>
      <span
        className={cn(
          'absolute inset-x-0 h-[15%] min-h-[4px]',
          mine ? 'bottom-0 hatch-mine' : 'top-0 hatch-theirs',
        )}
      />
    </span>
  );
}

/**
 * Who is playing, where the game stands, and what has happened.
 *
 * A tally slip: a second, narrower sheet beside the board's, ruled into rows,
 * every figure in the mono. It is the only column that scrolls, so the sheet
 * itself is fixed and the ruling scrolls inside it — otherwise the paper fibre
 * scrolls away from the top of its own sheet.
 */
export default function MatchSidebar({
  gameState,
  players,
  currentPlayerId,
  opponentConnected,
  battleLog,
  error,
}: MatchSidebarProps) {
  const state = readableState(gameState.state);
  const onBoard = Object.keys(gameState.board.pieces ?? {}).length;

  return (
    <aside className="sheet flex min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 overflow-y-auto px-4 py-4">
        {/*
         * An errata slip, not a red box. Whatever the server or a thrown Error
         * put in this string, it is a correction to the sheet — and it cannot be
         * a player's colour, because both of those are spoken for on this screen.
         */}
        {error && (
          <div role="alert" className="errata type-num mb-5 text-[11px] leading-[1.5]">
            {error}
          </div>
        )}

        <SlipHead>Players</SlipHead>
        <div className="mb-5">
          {Object.entries(players).map(([playerId, name], index) => {
            const isMe = playerId === currentPlayerId;
            const isActive = gameState.currentPlayerId === playerId;
            const columns = gameState.scores?.[playerId] ?? 0;
            const offline = !isMe && !opponentConnected;

            return (
              <div
                key={playerId}
                className={cn(
                  // The turn marker is a rule down the leading edge in that
                  // player's ink — the transparent one on the idle row keeps both
                  // names on the same measure.
                  'flex items-center gap-2.5 border-l-heavy py-2 pl-2.5',
                  index > 0 && 'border-t-hair border-t-ink',
                  isActive
                    ? isMe
                      ? 'border-l-verm'
                      : 'border-l-prus'
                    : 'border-l-transparent',
                )}
              >
                <PlayerMark initial={name.charAt(0).toUpperCase()} mine={isMe} />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="type-small truncate">{name}</span>
                    {isMe && <span className="type-micro shrink-0 text-ink-3">You</span>}
                  </span>
                  {isActive && <span className="type-micro block text-ink-3">To move</span>}
                </span>

                {offline ? (
                  <span className="stamp shrink-0 border-ochre">Offline</span>
                ) : (
                  <span className="shrink-0 text-right">
                    <span className="type-num block text-[15px] leading-none">{columns}</span>
                    <span className="type-micro block text-ink-3">
                      col{columns === 1 ? '' : 's'}
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <SlipHead>Where it stands</SlipHead>
        <dl className="mb-5">
          <TallyRow label="State" value={<span className="type-label">{state.label}</span>} />
          <TallyRow label="Cards in hand" value={gameState.currentPlayerHand.length} />
          {/* Out of fifteen, because a tally says what it is counting against. */}
          <TallyRow label="Cards on board" value={`${onBoard}/${CELLS}`} />
        </dl>

        <SlipHead>Moves</SlipHead>
        {battleLog.length === 0 ? (
          <p className="type-small mt-2 text-ink-3">Nothing played yet.</p>
        ) : (
          <ul>
            {battleLog.map((entry, index) => (
              <li
                key={`${entry}-${index}`}
                className={cn(
                  'type-num border-b-hair border-ink py-1.5 text-[11px] leading-[1.45]',
                  index === 0 ? 'text-ink' : 'text-ink-3',
                )}
              >
                {entry}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
