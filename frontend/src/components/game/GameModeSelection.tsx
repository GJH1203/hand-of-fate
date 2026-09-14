'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, KeyRound, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Modal } from '@/components/ui/modal';
import { Panel } from '@/components/ui/panel';
import { GameMode } from '@/types/gameMode';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { onlineGameService, ActiveGame } from '@/services/onlineGameService';
import { cn } from '@/lib/utils';

interface GameModeSelectionProps {
  onModeSelect: (mode: GameMode, matchId?: string) => void;
}

export default function GameModeSelection({ onModeSelect }: GameModeSelectionProps) {
  const { user } = useUnifiedAuth();
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);
  // Creating a match is not idempotent on the server — it clears any waiting room you
  // already own — so the second of two quick clicks would delete the room the first
  // one made. One dispatch per visit to this screen.
  const [dispatched, setDispatched] = useState(false);

  const checkForActiveGame = useCallback(async () => {
    if (!user?.playerId) return;
    try {
      const result = await onlineGameService.checkActiveGame(user.playerId);
      if (result.hasActiveGame) setActiveGame(result);
    } catch (error) {
      console.error('Error checking for active game:', error);
    }
  }, [user?.playerId]);

  useEffect(() => {
    checkForActiveGame();
  }, [checkForActiveGame]);

  const startCreate = () => {
    if (dispatched) return;
    if (activeGame) {
      setPendingAction('create');
    } else {
      setDispatched(true);
      onModeSelect(GameMode.ONLINE);
    }
  };

  const startJoin = () => {
    if (activeGame) {
      setPendingAction('join');
    } else {
      setShowJoin(true);
    }
  };

  const confirmAbandonAndContinue = async () => {
    const action = pendingAction;
    setPendingAction(null);

    if (user?.playerId) {
      try {
        await onlineGameService.leaveAllMatches(user.playerId);
      } catch (error) {
        console.error('Error abandoning current game:', error);
      }
    }
    setActiveGame(null);

    if (action === 'create') {
      setDispatched(true);
      onModeSelect(GameMode.ONLINE);
    } else if (action === 'join') {
      setShowJoin(true);
    }
  };

  const handleReconnect = () => {
    if (dispatched) return;
    if (activeGame?.matchId) {
      setDispatched(true);
      onModeSelect(GameMode.ONLINE, activeGame.matchId.replace('nakama_', ''));
    }
  };

  /**
   * Hands the code to the arena.
   *
   * The code is not checked here first, and cannot be: the only endpoint that would
   * answer "does this match exist" is `/match/{id}/state`, and it refuses anyone who
   * is not already in the match. A code that turns out to be wrong is reported by the
   * arena screen instead, which is where the join actually happens.
   */
  const submitJoin = () => {
    if (code.length !== 6 || dispatched) return;
    setDispatched(true);
    setShowJoin(false);
    onModeSelect(GameMode.ONLINE, code);
  };

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center px-6 py-16">
      <div className="stagger">
        <p className="type-label text-ember-400">Online</p>
        <h1 className="type-h1 mt-3 text-ink-hi">Start a duel</h1>
        <p className="type-body mt-3 text-ink-mid">
          Open a room and send the code, or type in the one you were sent. Either way the
          board opens as soon as both of you are there.
        </p>

        {activeGame && (
          <div className="mt-8">
            <InlineAlert tone="warning">
              <span className="text-ink-hi">You are already in a duel.</span> Rejoin it, or
              start something else and give it up.
            </InlineAlert>
            <Button
              size="lg"
              variant="secondary"
              className="mt-3 w-full border-success/40 text-success hover:border-success/70 hover:bg-success/10 hover:text-success sm:w-auto"
              onClick={handleReconnect}
            >
              <RotateCw size={18} strokeWidth={1.75} />
              Rejoin that duel
            </Button>
          </div>
        )}

        {/*
         * Two rows, not two towers.
         *
         * These are a primary action and its alternative, and the old screen gave them
         * equal billing as side-by-side cards — next to a third card that was greyed
         * out at 45% and said "Coming Soon", which spent half the screen saying nothing.
         * Stacked rows let the first one be visibly the main one, and the unbuilt modes
         * shrink to the line of text they are worth.
         */}
        <div className="mt-9 space-y-3">
          <ActionRow
            title="Create a room"
            body="You get a six-character code. Send it to whoever you are playing."
            accent
            disabled={dispatched}
            onClick={startCreate}
            icon={<ArrowRight size={18} strokeWidth={1.75} />}
          />
          <ActionRow
            title="Join with a code"
            body="Already been sent one? Type the six characters and you are in."
            disabled={dispatched}
            onClick={startJoin}
            icon={<KeyRound size={18} strokeWidth={1.75} />}
          />
        </div>

        <p className="type-small mt-8 border-t border-subtle pt-6 text-ink-low">
          Quick match and local same-device duels are not built yet.
        </p>
      </div>

      <Modal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        title="Join a duel"
        widthClassName="max-w-md"
      >
        <p className="type-small text-ink-low">
          The six characters your opponent sent you.
        </p>

        <div className="mt-6">
          <CodeInput value={code} onChange={setCode} autoFocus />
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowJoin(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitJoin} disabled={code.length !== 6 || dispatched}>
            Join
          </Button>
        </div>
      </Modal>

      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Give up your current duel?"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-ink-mid">
          You are in a match already. Starting another one abandons it, and it cannot be
          picked up again.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setPendingAction(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmAbandonAndContinue}>
            Abandon it
          </Button>
        </div>
      </Modal>
    </main>
  );
}

interface ActionRowProps {
  title: string;
  body: string;
  /** The one row on the screen that gets the accent. */
  accent?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

/** A full-width row you press. The chevron slides on hover; the whole row presses. */
function ActionRow({ title, body, accent, disabled, onClick, icon }: ActionRowProps) {
  return (
    <Panel
      tone="quiet"
      spotlight
      className={cn(
        'group w-full text-left transition-[transform,box-shadow] duration-200 ease-arcane',
        !disabled && 'hover:-translate-y-0.5 hover:shadow-card',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex w-full items-center gap-5 rounded-lg border px-6 py-5 text-left transition-colors duration-200 ease-arcane',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400',
          accent
            ? 'border-ember-400/35 hover:border-ember-400/60'
            : 'border-subtle hover:border-strong',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="type-h3 block text-ink-hi">{title}</span>
          <span className="type-small mt-1 block text-ink-mid">{body}</span>
        </span>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-transform duration-200 ease-arcane group-hover:translate-x-1',
            accent ? 'bg-ember-400 text-[#231405]' : 'bg-white/[0.06] text-ink-mid',
          )}
        >
          {icon}
        </span>
      </button>
    </Panel>
  );
}
