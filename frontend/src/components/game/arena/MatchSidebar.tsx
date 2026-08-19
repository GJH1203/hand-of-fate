import { Activity, ScrollText, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
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

/** Who is playing, where the game stands, and what has happened. The only column that scrolls. */
export default function MatchSidebar({
  gameState,
  players,
  currentPlayerId,
  opponentConnected,
  battleLog,
  error,
}: MatchSidebarProps) {
  const state = readableState(gameState.state);

  return (
    <aside className="min-h-0 space-y-4 overflow-y-auto pr-1">
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}

      <Panel>
        <PanelHeader icon={Users} title="Players" className="px-4 py-3" />
        <PanelBody className="space-y-2 p-3">
          {Object.entries(players).map(([playerId, name]) => {
            const isMe = playerId === currentPlayerId;
            const isActive = gameState.currentPlayerId === playerId;
            const columns = gameState.scores?.[playerId] ?? 0;

            return (
              <div
                key={playerId}
                className={cn(
                  'flex items-center gap-2.5 rounded-md border border-subtle bg-surface-2 px-3 py-2',
                  isActive && 'border-l-[3px] border-l-success',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-sm font-bold ring-2',
                    isMe ? 'text-gold-300 ring-gold-400/60' : 'text-danger ring-danger/60',
                  )}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate text-sm text-ink-hi">{name}</span>
                  {isMe && <span className="type-micro text-ink-low">You</span>}
                  {isActive && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-success"
                      style={{ animation: 'breathe 1.6s ease-in-out infinite' }}
                    />
                  )}
                </span>
                {!isMe && !opponentConnected ? (
                  <Badge tone="danger">Offline</Badge>
                ) : (
                  <Badge tone={isMe ? 'gold' : 'neutral'} className="tabular">
                    {columns} col{columns === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>
            );
          })}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader icon={Activity} title="Game Status" className="px-4 py-3" />
        <PanelBody className="space-y-2.5 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-mid">State</span>
            <Badge tone={state.tone}>{state.label}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-mid">Cards in hand</span>
            <span className="tabular text-ink-hi">{gameState.currentPlayerHand.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-mid">Cards on board</span>
            <span className="tabular text-ink-hi">
              {Object.keys(gameState.board.pieces ?? {}).length}
            </span>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader icon={ScrollText} title="Battle Log" className="px-4 py-3" />
        <PanelBody className="p-4">
          {battleLog.length === 0 ? (
            <p className="type-small text-ink-low">No moves yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {battleLog.map((entry, index) => (
                <li
                  key={`${entry}-${index}`}
                  className={cn('type-small', index === 0 ? 'text-ink-mid' : 'text-ink-low')}
                >
                  {entry}
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </aside>
  );
}
