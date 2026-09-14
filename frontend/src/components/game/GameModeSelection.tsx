'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { CodeInput } from '@/components/ui/code-input';
import { Modal } from '@/components/ui/modal';
import { GameMode } from '@/types/gameMode';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { onlineGameService, ActiveGame } from '@/services/onlineGameService';
import { cn } from '@/lib/utils';

interface GameModeSelectionProps {
  onModeSelect: (mode: GameMode, matchId?: string) => void;
}

/*
 * The gutter.
 *
 * A 7rem margin down the left of the sheet holding the label for whatever sits
 * beside it — the section on the header, the seat you would be taking on each of
 * the two actions. It is what makes this a laid-out page rather than a stack of
 * centred blocks, and because both use the same measure the titles line up all
 * the way down. It collapses below `sm`, where the label simply sits above.
 */
const GUTTER = 'sm:grid sm:grid-cols-[7rem_1fr] sm:gap-x-6';
/** 7rem of gutter plus the 1.5rem gap: anything indented to the text column. */
const GUTTER_INDENT = 'sm:ml-[8.5rem]';

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
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col justify-center px-0 sm:px-8 sm:py-12"
    >
      <div className="sheet min-h-dvh px-7 py-14 sm:min-h-0 sm:px-14 sm:py-16">
        <header className={GUTTER}>
          <p className="type-label text-verm-text sm:mt-[0.6rem]">Online</p>
          <div className="mt-4 sm:mt-0">
            <h1 className="type-h1 text-ink">Start a duel</h1>
            <p className="type-body mt-4 text-ink-2">
              Open a room and send the code, or type in the one you were sent. Either way the
              board opens as soon as both of you are there.
            </p>
          </div>
        </header>

        {activeGame && (
          /*
           * An errata slip, not a coloured alert. Nothing has gone wrong here — there
           * is a correction to make to what you were about to do — and the ochre bar
           * down the leading edge is the whole signal. A player's ink is never spent
           * on a message, which is what stopped crimson meaning both "the opponent"
           * and "something is wrong" on the same screen.
           */
          <div role="status" className={cn('errata mt-9', GUTTER_INDENT)}>
            <p className="type-small text-ink-2">
              <span className="text-ink">You are already in a duel.</span> Rejoin it, or start
              something else and give it up.
            </p>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={dispatched}
              className="btn btn--rule mt-3 h-10 px-4"
            >
              Rejoin that duel
            </button>
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
         *
         * Which of them is the main one is now carried by the weight of the rule above
         * it — 3px against 1.5px — rather than by a colour or a fill. On paper that is
         * the only honest way to say "this one first": ink is full strength everywhere
         * and the line gets heavier.
         */}
        <div className="mt-12 border-b-rule border-ink">
          <ActionRow
            seat="Host"
            title="Create a room"
            body="You get a six-character code. Send it to whoever you are playing."
            primary
            disabled={dispatched}
            onClick={startCreate}
          />
          <ActionRow
            seat="Challenger"
            title="Join with a code"
            body="Already been sent one? Type the six characters and you are in."
            disabled={dispatched}
            onClick={startJoin}
          />
        </div>

        <p className="type-small mt-8 border-t-hair border-rule-ghost pt-6 text-ink-3">
          Quick match and local same-device duels are not built yet.
        </p>
      </div>

      <Modal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        title="Join a duel"
        widthClassName="max-w-md"
      >
        <p className="type-small text-ink-2">The six characters your opponent sent you.</p>

        <div className="mt-6">
          <CodeInput value={code} onChange={setCode} autoFocus />
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowJoin(false)}
            className="btn btn--quiet h-10 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitJoin}
            disabled={code.length !== 6 || dispatched}
            className="btn btn--key h-10 px-5"
          >
            Join
          </button>
        </div>
      </Modal>

      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Give up your current duel?"
        widthClassName="max-w-sm"
      >
        <p className="type-small text-ink-2">
          You are in a match already. Starting another one abandons it, and it cannot be
          picked up again.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setPendingAction(null)}
            className="btn btn--quiet h-10 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmAbandonAndContinue}
            className="btn btn--key h-10 px-5"
          >
            Abandon it
          </button>
        </div>
      </Modal>
    </main>
  );
}

interface ActionRowProps {
  /** The seat this action puts you in. Sits in the gutter, and matches the lobby's list. */
  seat: string;
  title: string;
  body: string;
  /** The one row on the screen that gets the heavy rule. */
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * A full-width row you press.
 *
 * Ruled top and bottom and flush with the measure, so the stack reads as a set
 * table rather than as two floating cards: the rules line up with the headline
 * above them and with each other. Pressing moves the row down a pixel, because a
 * letterpress pushes the ink into the sheet — it does not lift off it.
 *
 * The arrow is the only icon, and it is here because it says where the row goes,
 * not because a row wants an ornament. It travels on hover, which is the one kind
 * of motion this design allows: something that physically moves.
 */
function ActionRow({ seat, title, body, primary, disabled, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group w-full border-ink py-6 text-left transition-colors duration-ink',
        primary ? 'border-t-heavy' : 'border-t-rule',
        GUTTER,
        disabled ? 'cursor-not-allowed' : 'hover:bg-paper-sunk active:translate-y-px',
      )}
    >
      <span className={cn('type-label block sm:mt-[0.45rem]', disabled ? 'text-ink-4' : 'text-ink-3')}>
        {seat}
      </span>

      <span className="mt-2 block min-w-0 sm:mt-0">
        <span className="flex items-start justify-between gap-6">
          <span
            className={cn(
              primary ? 'type-h2' : 'type-h3',
              'block',
              disabled ? 'text-ink-4' : 'text-ink',
            )}
          >
            {title}
          </span>
          <ArrowRight
            aria-hidden
            size={18}
            strokeWidth={1.75}
            className={cn(
              'mt-1 shrink-0 transition-transform duration-move ease-settle',
              disabled ? 'text-ink-4' : 'text-ink group-hover:translate-x-1',
            )}
          />
        </span>
        <span className={cn('type-small mt-1.5 block', disabled ? 'text-ink-4' : 'text-ink-2')}>
          {body}
        </span>
      </span>
    </button>
  );
}
