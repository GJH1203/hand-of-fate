import type { ReactNode } from 'react';

import { OwnerMark } from '../Pips';
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

/**
 * A section head: Roman capitals on the axis, over a gilt rule. Centred because
 * this design is axial, and an inscription over a line is the one place in a
 * data column where centring is not an affectation.
 */
function SlipHead({ children }: { children: ReactNode }) {
  return (
    <h2 className="type-label border-b-rule border-gold-deep pb-1.5 text-center text-parchment">
      {children}
    </h2>
  );
}

/** Label left, figure right, hairline under. Every figure is Spectral and tabular. */
function TallyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-hair border-gold-deep py-1.5">
      <dt className="type-label text-parchment-3">{label}</dt>
      <dd className="type-num text-[13px] text-parchment">{value}</dd>
    </div>
  );
}

/**
 * The player's mark: a small arched niche carrying their initial, built exactly
 * as one of their cards is — the figure at the foot for Sol and the head for
 * Luna, framed twice if it is yours, and the metal last. The same four channels
 * as the board at a twelfth the size, so the row and the pieces it is counting
 * are read the same way.
 *
 * Never a coloured ring. Gold against silver is about 1.25:1; a ring would be
 * the one channel that cannot be seen.
 */
function PlayerMark({ initial, mine }: { initial: string; mine: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex h-8 w-7 shrink-0 items-center justify-center rounded-arch border-rule bg-night-2',
        mine ? 'border-gold' : 'border-luna-deep',
      )}
    >
      {mine && <span className="absolute inset-[2px] rounded-arch border-hair border-gold-deep" />}
      <span
        className={cn(
          'type-num text-[13px] leading-none',
          mine ? '-translate-y-[2px] text-gold-lit' : 'translate-y-[2px] text-luna-lit',
        )}
      >
        {initial}
      </span>
      <OwnerMark
        mine={mine}
        className={cn(
          'absolute left-1/2 h-2 w-2 -translate-x-1/2',
          mine ? 'bottom-[2px] text-gold' : 'top-[2px] text-luna',
        )}
      />
    </span>
  );
}

/**
 * Who is playing, where the game stands, and what has happened.
 *
 * The narrow panel beside the board: ruled rows, gilt under every section head,
 * every figure in Spectral. It is the only column that scrolls, so the panel
 * itself is fixed and the ruling scrolls inside it — otherwise the frame scrolls
 * away from the top of its own board.
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
    <aside className="panel flex min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 overflow-y-auto px-4 py-4">
        {/*
         * A rubric, not a red box. Whatever the server or a thrown Error put in
         * this string, it is a correction to the page — and it cannot be in
         * either player's metal, because both of those are spoken for on this
         * screen.
         */}
        {error && (
          <div role="alert" className="rubric type-small mb-5 text-[13px] text-parchment-2">
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
                  // The turn marker is a heavy rule down the leading edge in
                  // that player's metal — the transparent one on the idle row
                  // keeps both names on the same measure.
                  'flex items-center gap-2.5 border-l-heavy py-2 pl-2.5',
                  index > 0 && 'border-t-hair border-t-gold-deep',
                  isActive
                    ? isMe
                      ? 'border-l-gold'
                      : 'border-l-luna'
                    : 'border-l-transparent',
                )}
              >
                <PlayerMark initial={name.charAt(0).toUpperCase()} mine={isMe} />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="type-small truncate">{name}</span>
                    {isMe && <span className="type-micro shrink-0 text-parchment-3">You</span>}
                  </span>
                  {isActive && <span className="type-micro block text-parchment-3">To move</span>}
                </span>

                {offline ? (
                  /* A dropped opponent is a genuine failure, so it earns the red. */
                  <span className="cartouche shrink-0 border-cinnabar text-cinnabar">Offline</span>
                ) : (
                  <span className="shrink-0 text-right">
                    <span className="type-num block text-[15px] leading-none text-parchment">
                      {columns}
                    </span>
                    <span className="type-micro block text-parchment-3">
                      column{columns === 1 ? '' : 's'}
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
          <p className="type-small mt-2 text-parchment-3">Nothing played yet.</p>
        ) : (
          <ul>
            {battleLog.map((entry, index) => (
              <li
                key={`${entry}-${index}`}
                className={cn(
                  'type-small border-b-hair border-gold-deep py-1.5 text-[12px] leading-[1.5]',
                  index === 0 ? 'text-parchment' : 'text-parchment-2',
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
