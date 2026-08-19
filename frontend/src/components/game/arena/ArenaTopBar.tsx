import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

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
    <header className="flex items-center justify-between gap-4 border-b border-subtle bg-surface-1/70 px-4 backdrop-blur-md">
      <Button variant="ghost" size="md" onClick={onLeave}>
        <ArrowLeft size={16} strokeWidth={1.75} />
        Back to Menu
      </Button>

      <div className="flex items-center gap-2 text-[13px] text-ink-mid">
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`} />
        {connected ? (
          <>
            <Wifi size={16} strokeWidth={1.75} className="text-success" />
            Connected
          </>
        ) : (
          <>
            <WifiOff size={16} strokeWidth={1.75} className="text-danger" />
            Reconnecting…
            <Spinner size={14} className="text-danger" />
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {earlyEndPending && <Badge tone="warning">Early End Requested</Badge>}
        <Badge tone={isMyTurn ? 'success' : 'danger'} dot>
          {isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`}
        </Badge>
        {roomCode && (
          <Badge tone="gold" className="font-mono tracking-[0.12em]">
            Room {roomCode}
          </Badge>
        )}
      </div>
    </header>
  );
}
