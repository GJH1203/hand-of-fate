import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ConnectionStatus } from './useOnlineMatch';

interface ArenaTopBarProps {
  connection: ConnectionStatus;
  isMyTurn: boolean;
  opponentName: string;
  roomCode: string | null;
  earlyEndPending: boolean;
  onLeave: () => void;
}

/**
 * The legend's swatch is a card in miniature, not a colour chip.
 *
 * A chip would state the weakest of the four ownership channels and none of the
 * three strong ones. This states the primary channel instead: the band is at the
 * FOOT of your card and at the HEAD of theirs, the hatch runs vertical for you
 * and horizontal for them, and yours is printed twice. Reading the legend
 * teaches the same three marks the board is actually played with, which is the
 * only reason to print a legend at all.
 */
function BandSwatch({ mine }: { mine: boolean }) {
  return (
    <span
      aria-hidden
      className="relative block h-6 w-[18px] shrink-0 rounded-card border-rule border-ink bg-paper-raised"
    >
      {mine && <span className="absolute inset-[2px] border border-ink" />}
      <span
        className={cn(
          'absolute inset-x-0 h-[20%] min-h-[4px]',
          mine ? 'bottom-0 hatch-mine' : 'top-0 hatch-theirs',
        )}
      />
    </span>
  );
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
    <header className="sheet flex items-center justify-between gap-4 border-b-heavy border-ink px-5">
      <div className="flex min-w-0 items-center gap-4">
        <button type="button" onClick={onLeave} className="btn btn--quiet h-8 px-2.5">
          <ArrowLeft size={14} strokeWidth={2} />
          Menu
        </button>

        {/*
         * The legend. Stated here, once, rather than on all fifteen squares — which
         * is what lets a card on the board carry no name plate at all.
         */}
        <div className="flex min-w-0 items-center gap-4 border-l-hair border-ink pl-4">
          <span className="flex items-center gap-2">
            <BandSwatch mine />
            <span className="type-label text-ink-2">You</span>
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <BandSwatch mine={false} />
            <span className="type-label max-w-[12ch] truncate text-ink-2">{opponentName}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/*
         * The one failure this game has. It is set as an errata slip — ink in a
         * ruled box with an ochre bar down the leading edge — and deliberately not
         * in a player's colour, because vermillion already means "you" two inches
         * to the left. The mark loops because the honest answer is "still trying";
         * it is the only thing on this screen allowed to move on its own.
         */}
        {!connected && (
          <div role="status" className="errata flex items-center gap-2 py-1">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 bg-ochre"
              style={{ animation: 'ink-pulse 1.4s ease-in-out infinite' }}
            />
            <span className="type-label">Reconnecting</span>
          </div>
        )}

        {/* Ochre is attention, and it is a rule here rather than the text: 3.59:1. */}
        {earlyEndPending && <span className="stamp border-ochre">Early end asked</span>}

        <span className={cn('stamp', isMyTurn ? 'stamp--mine' : 'stamp--theirs')}>
          {isMyTurn ? 'Your turn' : `${opponentName}’s turn`}
        </span>

        {roomCode && (
          <span className="flex items-center gap-2">
            <span className="type-micro text-ink-3">Room</span>
            {/*
             * Set as slugs, one character to a box. Read aloud that is six letters
             * with no word between them, so the visible slugs are hidden from the
             * accessibility tree and the code is given once, as a string.
             */}
            <span className="sr-only">Room code {roomCode}</span>
            <span aria-hidden className="flex gap-[3px]">
              {roomCode.split('').map((character, index) => (
                <span
                  key={`${character}-${index}`}
                  className="slug type-num h-[22px] w-[16px] text-[12px] leading-none"
                >
                  {character}
                </span>
              ))}
            </span>
          </span>
        )}
      </div>
    </header>
  );
}
