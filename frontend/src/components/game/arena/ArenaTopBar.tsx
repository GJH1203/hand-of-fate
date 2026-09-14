import { ArrowLeft } from 'lucide-react';

import { OwnerMark } from '../Pips';
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
 * three strong ones — gold against silver measures about 1.25:1, so two metal
 * chips beside each other say almost nothing. This states the channels that
 * carry the meaning instead: the FIGURE is a rayed disc for Sol and a crescent
 * for Luna, it sits at the FOOT of your card and the HEAD of theirs, and yours
 * is framed twice. Reading the legend teaches the same three marks the board is
 * actually played with, which is the only reason to print a legend at all.
 */
function MarkSwatch({ mine }: { mine: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block h-7 w-5 shrink-0 rounded-arch border-rule bg-night-1',
        mine ? 'border-gold' : 'border-luna-deep',
      )}
    >
      {mine && <span className="absolute inset-[2px] rounded-arch border-hair border-gold-deep" />}
      <OwnerMark
        mine={mine}
        className={cn(
          'absolute left-1/2 h-2 w-2 -translate-x-1/2',
          mine ? 'bottom-[3px] text-gold' : 'top-[3px] text-luna',
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
    /*
     * Three columns with the middle one on the axis, because the thing that
     * matters most on this bar — whose hour it is — belongs on the centre line
     * of the board it sits over, not floated to one end of the row.
     */
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b-rule border-gold-deep px-5">
      <div className="flex min-w-0 items-center gap-4">
        <button type="button" onClick={onLeave} className="btn btn--quiet h-8 px-2.5">
          <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          Menu
        </button>

        {/*
         * The legend. Stated here, once, rather than on all fifteen squares —
         * which is what lets a card on the board carry no name plate at all.
         * The swatches are hidden from the accessibility tree and each one is
         * given in words instead, because a shape is the whole point of them and
         * a shape does not read aloud.
         */}
        <div className="flex min-w-0 items-center gap-4 border-l-hair border-gold-deep pl-4">
          <span className="flex items-center gap-2">
            <MarkSwatch mine />
            <span className="type-label text-gold-lit">You</span>
            <span className="sr-only">Sol. Your cards carry a gold sun at the foot.</span>
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <MarkSwatch mine={false} />
            <span className="type-label max-w-[12ch] truncate text-luna">{opponentName}</span>
            <span className="sr-only">
              Luna. Their cards carry a silver moon at the head.
            </span>
          </span>
        </div>
      </div>

      {/*
       * The hour, on the axis, haloed.
       *
       * The aureole is concentric drawn rings rather than a glow, and it never
       * goes out — it belongs to whoever is to move, so it stays put and the
       * cartouche under it changes hands. Rings that appeared and vanished every
       * turn would be a fidget; a halo that holds still while the figure inside
       * it changes is how an icon marks the hour.
       *
       * It is gold either way, and that is right rather than sloppy: in icon
       * painting every halo is gold whoever wears it, because the light is not
       * the figure's own. WHO is carried by the three channels inside the
       * cartouche — the figure, the metal, and the words.
       */}
      <div className="flex items-center justify-center">
        <span
          className={cn(
            'aureole cartouche max-w-[24ch]',
            isMyTurn ? 'cartouche--sol' : 'cartouche--luna',
          )}
        >
          <OwnerMark mine={isMyTurn} className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {isMyTurn ? 'Your move' : `${opponentName} to move`}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-end gap-3">
        {/*
         * The one real failure this game has. It is set as a rubric — cinnabar
         * capitals behind a cinnabar bar — because red in a manuscript is an
         * index rather than an emotion: it marks the place you are meant to
         * look. It borrows neither player's metal, both of which are spoken for
         * two inches to the left. The mark loops because the honest answer is
         * "still trying", and it is the only thing on this bar allowed to move
         * on its own.
         */}
        {!connected && (
          <div role="status" className="rubric flex items-center gap-2 px-2.5 py-1">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 bg-cinnabar"
              style={{ animation: 'ink-pulse 1.4s ease-in-out infinite' }}
            />
            <span className="type-label text-cinnabar">Reconnecting</span>
          </div>
        )}

        {/* A pending request is a state, not a correction, so it stays off the red. */}
        {earlyEndPending && <span className="cartouche">Early end asked</span>}

        {roomCode && (
          <span className="flex items-center gap-2">
            <span className="type-micro text-parchment-3">Room</span>
            {/*
             * Set as slugs, one character to an arched niche. Read aloud that is
             * six letters with no word between them, so the visible slugs are
             * hidden from the accessibility tree and the code is given once, as
             * a string.
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
