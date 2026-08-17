'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Globe, KeyRound, RotateCw, Users, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Modal } from '@/components/ui/modal';
import { Panel, PanelBody } from '@/components/ui/panel';
import { GameMode } from '@/types/gameMode';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { onlineGameService, ActiveGame } from '@/services/onlineGameService';

interface GameModeSelectionProps {
  onModeSelect: (mode: GameMode, matchId?: string) => void;
}

const LOCAL_FEATURES = ['Same device gameplay', 'No internet required', 'Perfect for friends & family'];

export default function GameModeSelection({ onModeSelect }: GameModeSelectionProps) {
  const { user } = useUnifiedAuth();
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

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
    if (activeGame) {
      setPendingAction('create');
    } else {
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
      onModeSelect(GameMode.ONLINE);
    } else if (action === 'join') {
      setShowJoin(true);
    }
  };

  const handleReconnect = () => {
    if (activeGame?.matchId) {
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
    if (code.length !== 6) return;
    setShowJoin(false);
    onModeSelect(GameMode.ONLINE, code);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-gold-gradient font-display text-4xl font-bold tracking-[0.03em]">
            Choose Your Path
          </h1>
          <div className="rule-gold mx-auto mt-3 w-40" />
          <p className="mt-3 text-[15px] text-ink-mid">
            Select your battlefield for mystical card combat
          </p>
        </div>

        <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2">
          <Panel className="relative flex flex-col opacity-45">
            <Badge tone="neutral" className="absolute right-4 top-4">
              Coming Soon
            </Badge>
            <PanelBody className="flex flex-1 flex-col items-center pt-8 text-center">
              <Users size={28} strokeWidth={1.75} className="text-ink-mid" />
              <h2 className="type-h2 mt-4 text-ink-hi">Local Duel</h2>
              <p className="type-small mt-2 text-ink-mid">
                Face your opponent in person, sharing the same arena
              </p>
              <ul className="mt-5 w-full space-y-2 text-left">
                {LOCAL_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-[13px] text-ink-low">
                    <Check size={14} strokeWidth={1.75} className="shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </PanelBody>
          </Panel>

          <Panel className="flex flex-col" style={{ borderColor: 'rgba(217,174,78,0.25)' }}>
            <PanelBody className="flex flex-1 flex-col items-center pt-8 text-center">
              <Globe size={28} strokeWidth={1.75} className="text-gold-400" />
              <h2 className="type-h2 mt-4 text-ink-hi">Global Arena</h2>
              <p className="type-small mt-2 text-ink-mid">
                Challenge mystics across realms in real-time duels
              </p>

              <div className="mt-6 w-full space-y-2.5">
                {activeGame && (
                  <>
                    <InlineAlert tone="warning" className="text-left">
                      You have a battle in progress
                    </InlineAlert>
                    <Button
                      size="lg"
                      className="w-full border-0 bg-gradient-to-b from-success to-[#27a86c] text-[#04231A] hover:brightness-[1.07]"
                      onClick={handleReconnect}
                    >
                      <RotateCw size={18} strokeWidth={1.75} />
                      Reconnect to Battle
                    </Button>
                  </>
                )}

                <Button variant="primary" size="lg" className="w-full" onClick={startCreate}>
                  <Zap size={18} strokeWidth={1.75} />
                  Create Game
                </Button>
                <Button variant="secondary" size="lg" className="w-full" onClick={startJoin}>
                  <KeyRound size={18} strokeWidth={1.75} />
                  Join with Code
                </Button>
                <Button variant="ghost" size="lg" className="w-full" disabled>
                  Quick Match (Coming Soon)
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>

      <Modal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        title="Join Mystical Battle"
        widthClassName="max-w-md"
      >
        <p className="type-small text-ink-low">
          Enter the six-character code your opponent shared with you.
        </p>

        <div className="mt-5">
          <CodeInput value={code} onChange={setCode} autoFocus />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowJoin(false)}>
            Back
          </Button>
          <Button variant="primary" onClick={submitJoin} disabled={code.length !== 6}>
            Join Battle
          </Button>
        </div>
      </Modal>

      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Abandon your current battle?"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-ink-mid">
          You are already in a duel. Starting another one abandons it, and it cannot be resumed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setPendingAction(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmAbandonAndContinue}>
            Abandon &amp; continue
          </Button>
        </div>
      </Modal>
    </main>
  );
}
