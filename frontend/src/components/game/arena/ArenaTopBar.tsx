import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { ConnectionStatus } from './useOnlineMatch';

interface ArenaTopBarProps {
  connection: ConnectionStatus;
  isMyTurn: boolean;
  opponentName: string;
  roomCode: string | null;
  earlyEndPending: boolean;
  onLeave: () => void;
}

/** Who is to move, whether the socket is alive, and which room this is. */
export default function ArenaTopBar({
  connection,
  isMyTurn,
  opponentName,
  roomCode,
  earlyEndPending,
  onLeave,
}: ArenaTopBarProps) {
  const connected = connection === 'connected';

  return (
    <header className="flex items-center justify-between gap-4 border-b border-subtle bg-surface-0/75 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="md" onClick={onLeave}>
          <ArrowLeft size={16} strokeWidth={1.75} />
          Menu
        </Button>

        {/*
         * The legend. Two swatches naming the two colours the board is played in.
         *
         * Ownership on the board is carried by the card's edge colour and nothing else
         * — that is what let the cards drop the "YOU" pill that used to cover the art —
         * which only works if the colours are stated somewhere. Here, once, rather than
         * on all fifteen squares.
         */}
        <div className="flex items-center gap-3 border-l border-subtle pl-4 text-[13px]">
          <span className="flex items-center gap-1.5 text-ink-mid">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-ember-400" />
            You
          </span>
          <span className="flex items-center gap-1.5 text-ink-mid">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-steel-400" />
            <span className="max-w-[12ch] truncate">{opponentName}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {!connected && (
          <span className="flex items-center gap-1.5 text-[13px] text-danger">
            <Spinner size={13} />
            Reconnecting…
          </span>
        )}
        {earlyEndPending && <Badge tone="warning">Early end asked</Badge>}
        <Badge tone={isMyTurn ? 'success' : 'steel'} dot>
          {isMyTurn ? 'Your turn' : `${opponentName}’s turn`}
        </Badge>
        {roomCode && (
          <Badge tone="neutral" className="tabular tracking-[0.18em]">
            {roomCode}
          </Badge>
        )}
      </div>
    </header>
  );
}
