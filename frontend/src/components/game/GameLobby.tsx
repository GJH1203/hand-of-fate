'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Copy, Share2, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { onlineGameService } from '@/services/onlineGameService';
import { OnlineMatchInfo } from '@/types/gameMode';

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
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <Panel className="w-full max-w-[460px]">
        <PanelBody className="p-7">
          <h1 className="type-h2 text-center text-ink-hi">
            {isHost ? 'Summoning Opponent' : 'Entering Arena'}
          </h1>
          <p className="type-small mt-1 text-center text-ink-low">Sacred Battle Code</p>

          <div
            className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-surface-0 px-5 py-4"
            style={{ border: '2px solid rgba(217,174,78,0.45)' }}
          >
            <code className="flex-1 text-center font-display text-[40px] font-bold leading-none tracking-[0.25em] text-gold-300 tabular">
              {gameCode}
            </code>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy the battle code"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gold-400 transition-colors duration-150 hover:bg-gold-400/10 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400"
            >
              {copiedCode ? (
                <Check size={18} strokeWidth={1.75} />
              ) : (
                <Copy size={18} strokeWidth={1.75} />
              )}
            </button>
          </div>

          <div className="mt-6 space-y-2.5">
            <div
              className="flex items-center justify-between rounded-md px-4 py-3"
              style={{
                backgroundColor: 'rgba(61,214,140,0.06)',
                border: '1px solid rgba(61,214,140,0.22)',
              }}
            >
              <span className="flex items-center gap-2.5 text-sm text-ink-hi">
                <Shield size={16} strokeWidth={1.75} className="text-success" />
                Champion (Host)
              </span>
              <CheckCircle2 size={18} strokeWidth={1.75} className="text-success" />
            </div>

            <div className="flex items-center justify-between rounded-md border border-subtle bg-surface-2 px-4 py-3">
              <span className="flex items-center gap-2.5 text-sm text-ink-mid">
                <Shield size={16} strokeWidth={1.75} className="text-ink-low" />
                {hasOpponent ? 'Challenger' : 'Waiting for challenger…'}
              </span>
              {hasOpponent ? (
                <CheckCircle2 size={18} strokeWidth={1.75} className="text-success" />
              ) : (
                <Spinner size={16} className="text-arcane-300" />
              )}
            </div>
          </div>

          {hasOpponent ? (
            <p className="mt-6 text-center text-sm text-ink-mid">
              Battle commencing in{' '}
              <span className="font-display text-lg font-bold text-gold-300 tabular">
                {countdown}
              </span>
            </p>
          ) : (
            <p className="type-small mt-6 text-center text-ink-low">
              Share the code above. The arena opens the moment they arrive.
            </p>
          )}

          <div className="mt-7 space-y-2.5">
            {isHost && !hasOpponent && (
              <Button variant="secondary" size="lg" className="w-full" onClick={copyLink}>
                <Share2 size={18} strokeWidth={1.75} />
                Share Portal Link
              </Button>
            )}
            <Button
              variant="danger"
              size="lg"
              className="w-full"
              onClick={() => setConfirmAbandon(true)}
              disabled={hasOpponent}
            >
              {hasOpponent ? 'Portal Opening…' : 'Abandon Match'}
            </Button>
          </div>
        </PanelBody>
      </Panel>

      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Abandon this battle?"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-ink-mid">
          The room will be closed and the sacred code will expire.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAbandon(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onCancel}>
            Abandon
          </Button>
        </div>
      </Modal>
    </main>
  );
}
