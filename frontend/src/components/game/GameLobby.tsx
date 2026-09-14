'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Panel } from '@/components/ui/panel';
import { Spinner } from '@/components/ui/spinner';
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
    <main id="main" className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center px-6 py-16">
      <div className="stagger">
        <p className="type-label text-ember-400">
          {hasOpponent ? 'Both here' : isHost ? 'Waiting' : 'Joining'}
        </p>
        <h1 className="type-h1 mt-3 text-ink-hi">
          {hasOpponent ? 'Your opponent is here' : isHost ? 'Send them the code' : 'Finding the room'}
        </h1>

        {/*
         * The code, set as large as the room allows.
         *
         * It is the one thing on this screen anybody has to do something with — read it
         * out, or type it into a chat window — so it is the size of a headline and not
         * a field label. The characters are spaced out because six run-together
         * characters get miscopied, and lined tabular so they never reflow.
         */}
        <Panel tone="raised" className="mt-7 overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-6">
            <code className="flex-1 text-center text-[44px] font-bold leading-none tracking-[0.22em] text-ember-300 tabular">
              {gameCode}
            </code>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy the room code"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-mid transition-all duration-200 ease-arcane hover:bg-ember-400/10 hover:text-ember-300 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400"
            >
              {copiedCode ? (
                <Check size={19} strokeWidth={2} className="text-success" />
              ) : (
                <Copy size={19} strokeWidth={1.75} />
              )}
            </button>
          </div>

          {/* Seat list. A filled bar for a seat taken, a hollow one for a seat waiting. */}
          <div className="border-t border-subtle">
            <Seat label={isHost ? 'You — host' : 'Host'} present />
            <Seat
              label={hasOpponent ? (isHost ? 'Challenger' : 'You — challenger') : 'Waiting for a challenger'}
              present={hasOpponent}
              last
            />
          </div>
        </Panel>

        {hasOpponent ? (
          <p className="mt-6 flex items-center gap-2.5 text-sm text-ink-mid">
            <span className="h-2 w-2 rounded-full bg-success" />
            Board opens in{' '}
            <span className="text-[17px] font-bold text-ember-300 tabular">{countdown}</span>
          </p>
        ) : (
          <p className="type-small mt-6 text-ink-low">
            The board opens by itself the moment they arrive. You can leave this tab open.
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          {isHost && !hasOpponent && (
            <Button variant="secondary" size="lg" onClick={copyLink}>
              <Link2 size={18} strokeWidth={1.75} />
              Copy invite link
            </Button>
          )}
          {!hasOpponent && (
            <Button variant="link" onClick={() => setConfirmAbandon(true)}>
              Close this room
            </Button>
          )}
        </div>
      </div>

      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Close this room?"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-ink-mid">
          You will go back to the menu and stop waiting. Anyone you already sent the code to
          will not be able to get in.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAbandon(false)}>
            Keep waiting
          </Button>
          <Button variant="danger" onClick={onCancel}>
            Close it
          </Button>
        </div>
      </Modal>
    </main>
  );
}

/** One row of the seat list: a status mark, a name, and nothing else. */
function Seat({ label, present, last }: { label: string; present: boolean; last?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-6 py-3.5 text-sm',
        !last && 'border-b border-subtle',
      )}
    >
      {present ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
          <Check size={12} strokeWidth={2.5} className="text-success" />
        </span>
      ) : (
        <span className="flex h-5 w-5 items-center justify-center">
          <Spinner size={14} className="text-ink-low" />
        </span>
      )}
      <span className={present ? 'text-ink-hi' : 'text-ink-low'}>{label}</span>
    </div>
  );
}
