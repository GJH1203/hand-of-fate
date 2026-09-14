'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Modal } from '@/components/ui/modal';
import { OwnerMark } from './Pips';
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

/**
 * The waiting room.
 *
 * Axial, and built around one image: the room code standing as six arched
 * niches. That is the only thing on this screen anybody does anything with —
 * read it out, or paste it into a chat window — so it is set the way a
 * compositor sets six characters that must not be misread: one piece of type per
 * character, each in its own body, with a real gap to the next. Six run-together
 * characters get miscopied; six separate niches cannot be.
 *
 * The niches are `.slug`, the same class the join screen's code input uses, at
 * the same size — the thing you read off this screen and the thing you type into
 * that one have to look like the same object.
 */
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
      className="mx-auto flex min-h-dvh w-full max-w-[38rem] flex-col justify-center px-4 py-10 sm:px-8 sm:py-14"
    >
      {/*
       * The top padding clears the head of the arch: the curve takes about 70px
       * out of the inner edge of a panel this tall.
       */}
      <div className="panel px-6 pb-12 pt-12 text-center sm:px-12 sm:pb-14 sm:pt-14">
        <p className="type-label text-gold">
          {hasOpponent ? 'Both here' : isHost ? 'Waiting' : 'Joining'}
        </p>
        <h1 className="type-h1 mt-5 text-parchment">
          {hasOpponent ? 'Your opponent is here' : isHost ? 'Send them the code' : 'Finding the room'}
        </h1>

        {/*
         * Three rules, the middle one heavier: a centre panel between two wings.
         * It is the shape of the board — three columns, two of them win it — used
         * as the device under an inscription, and it is the one ornament on this
         * screen and the one before it.
         */}
        <span aria-hidden className="mt-6 flex items-center justify-center gap-2">
          <span className="block h-px w-6 bg-gold-deep" />
          <span className="block h-[2px] w-10 bg-gold" />
          <span className="block h-px w-6 bg-gold-deep" />
        </span>

        <div className="mt-11">
          <p className="type-micro text-parchment-3">Room code</p>

          {/* Read as one string, not as six loose characters. */}
          <span className="sr-only">Room code: {gameCode.split('').join(' ')}</span>

          <div
            aria-hidden
            className="mx-auto mt-4 flex max-w-[23rem] items-stretch justify-center gap-2 sm:gap-2.5"
          >
            {gameCode.split('').map((char, index) => (
              <span
                key={index}
                className={cn(
                  'slug h-[4.25rem] flex-1 sm:h-[5rem]',
                )}
              >
                {/*
                 * `.type-code` carries 0.3em of tracking, which is space added after
                 * each character — on a single character in a centred box that pushes
                 * the glyph left of centre by exactly that much. The matching left
                 * padding puts it back. The colour comes from `.slug` itself, which
                 * sets the lit gold a character standing in a niche is cut in.
                 */}
                <span className="type-code pl-[0.3em]">{char}</span>
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={copyCode} className="btn h-10 px-4">
              {copiedCode ? (
                <Check aria-hidden size={16} strokeWidth={2} />
              ) : (
                <Copy aria-hidden size={15} strokeWidth={1.75} />
              )}
              Copy code
            </button>
            {isHost && !hasOpponent && (
              <button type="button" onClick={copyLink} className="btn h-10 px-4">
                Copy invite link
              </button>
            )}
          </div>
        </div>

        {/*
         * The seat list. The mark is the ownership figure the board uses — a rayed
         * disc for Sol, which is always you, and a crescent for Luna, which is
         * always the other player — so the pairing you will read on every card is
         * established here, before a card exists. An empty seat is the moon before
         * it has risen: the Luna crescent, unlit, and the only thing on the screen
         * that loops. It loops because the honest answer is "we are still waiting".
         */}
        <div className="mt-11 border-y-rule border-gold-deep">
          <Seat role="Host" mine={isHost} present status={isHost ? 'You' : 'Seated'} />
          <Seat
            role="Challenger"
            mine={!isHost}
            present={hasOpponent}
            status={hasOpponent ? (isHost ? 'Seated' : 'You') : 'Waiting'}
            divider
          />
        </div>

        {hasOpponent ? (
          <p className="type-label mt-9 text-parchment">
            Board opens in{' '}
            <span className="type-num ml-1 text-[1.0625rem] text-gold-lit">{countdown}</span>
          </p>
        ) : (
          <p className="type-small mx-auto mt-9 max-w-[44ch] text-parchment-2">
            The board opens by itself the moment they arrive. You can leave this tab open.
          </p>
        )}

        {!hasOpponent && (
          <div className="mt-9 flex justify-center">
            <button type="button" onClick={() => setConfirmAbandon(true)} className="link">
              Stop waiting
            </button>
          </div>
        )}
      </div>

      {/*
       * This dialog used to promise that the room closed and the code expired.
       * Nothing in the backend does either: leaving sends LEAVE_MATCH, which
       * detaches this socket from the match and answers LEAVE_SUCCESS, and
       * `cleanupMatch` — the method that would empty the room's entry — is written
       * and never called. So the copy claims only what leaving actually does.
       */}
      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Stop waiting?"
        widthClassName="max-w-sm"
      >
        <p className="type-small text-center text-parchment-2">
          You go back to the menu. This does not close the room or expire the code, so tell
          whoever you sent it to — otherwise they are left waiting on a room you have walked
          away from.
        </p>
        <div className="mt-6 flex justify-center gap-3">
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
  /** Host or Challenger — the same two words the start screen puts above each action. */
  role: string;
  /** Whether this seat is yours: Sol if it is, Luna if it is the other player's. */
  mine: boolean;
  present: boolean;
  /** Who is in it: you, somebody else, or nobody yet. */
  status: string;
  divider?: boolean;
}

/** One row of the seat list: the figure, the seat, and who is in it. */
function Seat({ role, mine, present, status, divider }: SeatProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 py-4',
        divider && 'border-t-hair border-gold-deep',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'block h-4 w-4 shrink-0',
          present ? (mine ? 'text-gold' : 'text-luna') : mine ? 'text-gold-deep' : 'text-luna-deep',
        )}
        /* The one loop the system allows, and only while the answer is "nobody yet". */
        style={present ? undefined : { animation: 'ink-pulse 1900ms ease-in-out infinite' }}
      >
        <OwnerMark mine={mine} className="h-full w-full" />
      </span>

      <span className={cn('type-label', present ? 'text-parchment' : 'text-parchment-3')}>
        {role}
      </span>

      <span
        className={cn(
          'cartouche',
          present ? (mine ? 'cartouche--sol' : 'cartouche--luna') : undefined,
        )}
      >
        {status}
      </span>
    </div>
  );
}
