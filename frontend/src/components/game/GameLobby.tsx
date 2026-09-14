'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { onlineGameService } from '@/services/onlineGameService';
import { OnlineMatchInfo } from '@/types/gameMode';
import { cn } from '@/lib/utils';

interface GameLobbyProps {
  matchInfo: OnlineMatchInfo;
  currentPlayerId: string;
  onGameStart: () => void;
  onCancel: () => void;
}

/** How often the host asks the server whether anyone has turned up. */
const POLL_INTERVAL_MS = 5000;

export default function GameLobby({
  matchInfo,
  currentPlayerId,
  onGameStart,
  onCancel,
}: GameLobbyProps) {
  const toast = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isHost = matchInfo.player1Id === currentPlayerId;
  const hasOpponent = !!matchInfo.player2Id;
  const gameCode = matchInfo.matchId.slice(-6).toUpperCase();

  const onGameStartRef = useRef(onGameStart);
  onGameStartRef.current = onGameStart;

  useEffect(() => {
    if (hasOpponent && countdown === null) setCountdown(3);
  }, [hasOpponent, countdown]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onGameStartRef.current();
      return;
    }
    const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  /*
   * The socket event that says "your opponent arrived" does not always reach the host,
   * which left them watching this screen while the game they created was already under
   * way. Asking the server directly every few seconds costs one request and closes it.
   * `/match/{id}/state` only answers once the game exists — which is exactly the moment
   * the second player joined — so a successful reply is the signal.
   */
  useEffect(() => {
    if (!isHost || hasOpponent) return;

    let cancelled = false;
    const poll = window.setInterval(async () => {
      try {
        await onlineGameService.getMatchState(matchInfo.matchId);
        if (!cancelled) onGameStartRef.current();
      } catch {
        // Still nobody there. Nothing to report.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [isHost, hasOpponent, matchInfo.matchId]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(gameCode);
    setCopiedCode(true);
    toast('Code copied', 'success');
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/game?join=${gameCode}`);
    toast('Link copied', 'success');
  };

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-[620px] flex-col justify-center px-0 sm:px-8 sm:py-12"
    >
      <div className="sheet min-h-dvh px-7 py-14 sm:min-h-0 sm:px-12 sm:py-16">
        <p className="type-label text-verm-text">
          {hasOpponent ? 'Both here' : isHost ? 'Waiting' : 'Joining'}
        </p>
        <h1 className="type-h1 mt-5 text-ink">
          {hasOpponent ? 'Your opponent is here' : isHost ? 'Send them the code' : 'Finding the room'}
        </h1>

        {/*
         * The code, set as six slugs.
         *
         * It is the one thing on this screen anybody has to do something with — read it
         * out, or paste it into a chat window — so it is set the way a compositor would
         * set six characters that must not be misread: one piece of type per character,
         * in its own body, with a real gap to the next. Six run-together characters get
         * miscopied; six separate boxes cannot be.
         */}
        <div className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <p className="type-label text-ink-3">Room code</p>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy the room code"
              className="btn btn--quiet h-9 w-9 p-0"
            >
              {copiedCode ? (
                <Check aria-hidden size={17} strokeWidth={2} />
              ) : (
                <Copy aria-hidden size={16} strokeWidth={1.75} />
              )}
            </button>
          </div>

          {/* Read as one string, not as six loose characters. */}
          <span className="sr-only">Room code: {gameCode.split('').join(' ')}</span>

          <div aria-hidden className="mt-3 flex gap-2 sm:gap-2.5">
            {gameCode.split('').map((char, index) => (
              <span
                key={index}
                className={cn(
                  'slug h-[3.75rem] flex-1 sm:h-[4.5rem]',
                  /*
                   * The fourth slug sits one pixel low, always — not on hover, not
                   * animated. A stick of type with one piece standing slightly proud
                   * of its neighbours is what a real setting looks like, and a system
                   * with no irregularity anywhere in it reads as generated. This is
                   * deliberate and it is not a bug.
                   */
                  index === 3 && 'translate-y-px',
                )}
              >
                {/*
                 * `.type-code` carries 0.28em of tracking, which is space added after
                 * each character — on a single character in a centred box that pushes
                 * the glyph left of centre by exactly that much. The matching left
                 * padding puts it back.
                 */}
                <span className="type-code pl-[0.28em] text-ink">{char}</span>
              </span>
            ))}
          </div>
        </div>

        {/*
         * The seat list: a filled lozenge for a seat taken, a hollow one for a seat
         * still empty. The hollow one is the only thing on the screen that loops, and
         * it loops because the honest answer really is "we are still waiting".
         */}
        <div className="mt-10 border-y-rule border-ink">
          <Seat role="Host" present status={isHost ? 'You' : 'Seated'} />
          <Seat
            role="Challenger"
            present={hasOpponent}
            status={hasOpponent ? (isHost ? 'Seated' : 'You') : 'Waiting'}
            divider
          />
        </div>

        {hasOpponent ? (
          <p className="type-label mt-8 text-ink">
            Board opens in{' '}
            <span className="type-num ml-0.5 text-[15px] text-verm-text">{countdown}</span>
          </p>
        ) : (
          <p className="type-small mt-8 text-ink-2">
            The board opens by itself the moment they arrive. You can leave this tab open.
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          {isHost && !hasOpponent && (
            <button type="button" onClick={copyLink} className="btn btn--rule h-11 px-5">
              Copy invite link
            </button>
          )}
          {!hasOpponent && (
            <button type="button" onClick={() => setConfirmAbandon(true)} className="link">
              Stop waiting
            </button>
          )}
        </div>
      </div>

      {/*
       * This dialog used to promise that the room closed and the code expired. Nothing
       * in the backend does either: `cleanupMatch` is written and never called, so the
       * room's entry outlives the player who left it. The copy now claims only what
       * leaving actually does, which is take you back to the menu.
       */}
      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Stop waiting?"
        widthClassName="max-w-sm"
      >
        <p className="type-small text-ink-2">
          You go back to the menu and stop waiting for a challenger. Tell whoever you sent the
          code to, so they are not left waiting on a room you have walked away from.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmAbandon(false)}
            className="btn btn--quiet h-10 px-4"
          >
            Keep waiting
          </button>
          <button type="button" onClick={onCancel} className="btn btn--key h-10 px-5">
            Stop waiting
          </button>
        </div>
      </Modal>
    </main>
  );
}

interface SeatProps {
  /** Host or Challenger — the same two words the start screen puts in its gutter. */
  role: string;
  present: boolean;
  /** Who is in it: you, somebody else, or nobody yet. */
  status: string;
  divider?: boolean;
}

/** One row of the seat list: a mark, the seat, and who is in it. */
function Seat({ role, present, status, divider }: SeatProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3.5',
        divider && 'border-t-hair border-rule-ghost',
      )}
    >
      {present ? (
        <span aria-hidden className="h-2 w-2 rotate-45 bg-ink" />
      ) : (
        <span
          aria-hidden
          className="h-2 w-2 rotate-45 border-rule border-ink-3"
          style={{ animation: 'ink-pulse 1900ms var(--ease-settle) infinite' }}
        />
      )}
      <span className={cn('type-label', present ? 'text-ink' : 'text-ink-3')}>{role}</span>
      <span className={cn('type-micro ml-auto', present ? 'text-ink-2' : 'text-ink-3')}>
        {status}
      </span>
    </div>
  );
}
