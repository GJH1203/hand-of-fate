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
 * THE TRIPTYCH ORNAMENT.
 *
 * Three rules, the middle one heavier: a centre panel between two wings. It is
 * the shape of the board — three columns, and you win by taking two of them —
 * used as the small mark that separates a title from what follows it, the way a
 * frontispiece puts a device under its inscription. It is the one ornament on
 * these two screens, and it carries the same meaning on both.
 */
function Triptych() {
  return (
    <span aria-hidden className="mt-6 flex items-center justify-center gap-2">
      <span className="block h-px w-6 bg-gold-deep" />
      <span className="block h-[2px] w-10 bg-gold" />
      <span className="block h-px w-6 bg-gold-deep" />
    </span>
  );
}

/**
 * Starting a duel: open a room, or join one with a code.
 *
 * CENTRED, AND THAT IS A REVERSAL. The design before this one hung the whole
 * screen off a 7rem gutter down the left edge — the label for each block sat in
 * the margin beside it, and the deliberate asymmetry was the point. This design
 * is axial: a temple is symmetrical about its centre line, an icon is frontal, a
 * tympanum is centred. So the gutter is gone and everything stands on the axis,
 * inside one arched panel.
 *
 * The two actions are still two stacked rows rather than two side-by-side cards.
 * They are a primary action and its alternative, not a pair of equals, and which
 * one is primary is carried by WEIGHT — the create row is framed twice, a gilt
 * rule and an inner keyline, exactly the way your own cards are framed twice on
 * the board. Hovering lights the frame; it does not fill it. Gold is light here,
 * not a surface colour, and a gilded ground on a control this size would spend
 * the screen's whole reserve of it.
 */
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
      className="mx-auto flex min-h-dvh w-full max-w-[44rem] flex-col justify-center px-4 py-10 sm:px-8 sm:py-14"
    >
      {/*
       * One arched panel, and the arch is not decoration: a niche is something
       * that contains a figure, and this panel contains the whole act of starting
       * a game. The top padding is what clears the head of the arch — the curve
       * eats about 70px at the inner edge of a panel this tall.
       */}
      <div className="panel px-6 pb-12 pt-12 text-center sm:px-14 sm:pb-14 sm:pt-14">
        <header>
          <p className="type-label text-gold">Online</p>
          <h1 className="type-h1 mt-5 text-parchment">Start a duel</h1>
          <Triptych />
          <p className="type-body mx-auto mt-6 text-parchment-2">
            Open a room and send the code, or type in the one you were sent. Either way the
            board opens as soon as both of you are there.
          </p>
        </header>

        {activeGame && (
          /*
           * A rubric, not a coloured alert. Red in a manuscript is an index rather
           * than an emotion — it marks the place you are meant to look — so a
           * correction is a cinnabar bar and nothing else. Neither player's metal
           * is ever spent on a message, which is what stops gold meaning both
           * "you" and "something needs attention" on the same screen.
           */
          <div role="status" className="rubric mx-auto mt-10 max-w-[34rem] text-left">
            <p className="type-small text-parchment-2">
              <span className="text-parchment">You are already in a duel.</span> Rejoin it, or
              start something else and give that one up.
            </p>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={dispatched}
              className="btn btn--key mt-4 h-10 px-4"
            >
              Rejoin that duel
            </button>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4">
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
            body="Type in the six characters you were sent, and the board opens."
            disabled={dispatched}
            onClick={startJoin}
          />
        </div>

        <p className="type-small mx-auto mt-10 max-w-[34rem] border-t-hair border-gold-deep pt-6 text-parchment-3">
          Quick match and local same-device duels are not built yet.
        </p>
      </div>

      <Modal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        title="Join a duel"
        widthClassName="max-w-md"
      >
        <p className="type-small text-center text-parchment-2">
          The six characters your opponent sent you.
        </p>

        <div className="mt-6">
          <CodeInput value={code} onChange={setCode} autoFocus />
        </div>

        <div className="mt-7 flex justify-center gap-3">
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

      {/*
       * This one is allowed to say the duel cannot be picked up again, because it
       * is true: `leave-all` marks the player's active game ABANDONED in the
       * database before it drops the room. The lobby's dialog is the one that must
       * not make that promise — leaving a room there only closes a socket.
       */}
      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Give up your current duel?"
        widthClassName="max-w-sm"
      >
        <p className="type-small text-center text-parchment-2">
          Starting another duel marks the one you are in as abandoned. It cannot be rejoined
          afterwards.
        </p>
        <div className="mt-6 flex justify-center gap-3">
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
  /** The seat this action puts you in. Sits above the title, and matches the lobby's list. */
  seat: string;
  title: string;
  body: string;
  /** The one row on the screen that is framed twice. */
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * A full-width row you press: a ruled panel, cut square.
 *
 * Square, because an arch marks a niche — something that contains a figure — and
 * an arched button reads as a headstone. The rule is the whole control: it lights
 * on hover rather than filling, because light is what gold is in this system and
 * a fill would put a second gilded ground on a screen that is saving its gold for
 * the board.
 *
 * The arrow is the only icon, and it is here because it says where the row goes,
 * not because a row wants an ornament. It travels on hover, which is the one kind
 * of motion this design allows: something that physically moves. It sits on the
 * centre line below the text on a narrow screen and in the right margin on a wide
 * one, so it never crowds the words.
 */
function ActionRow({ seat, title, body, primary, disabled, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative block w-full border-rule bg-night-2 px-6 py-7 text-center',
        'transition-colors duration-lume sm:px-14',
        primary ? 'border-gold' : 'border-gold-deep',
        disabled
          ? 'cursor-not-allowed'
          : cn('active:translate-y-px', primary ? 'hover:border-gold-lit' : 'hover:border-gold'),
      )}
    >
      {/*
       * Framed twice, the way your own cards are framed twice on the board: a
       * gilt rule and an inner keyline. Weight is how this design says "this one
       * first" — a colour would have to borrow from Sol or Luna, and a fill would
       * have to borrow the gold.
       */}
      {primary && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[4px] border border-gold-deep"
        />
      )}

      <span className={cn('type-micro block', disabled ? 'text-parchment-4' : 'text-gold')}>
        {seat}
      </span>

      {/*
       * Both titles are cut in the same inscriptional capitals — Marcellus sets
       * every title in this system, and a serif subhead on one row and Roman caps
       * on the other would read as an accident rather than as a hierarchy. What
       * separates them is the light: the primary title is lit gold, the other is
       * parchment.
       */}
      <span
        className={cn(
          'type-h2 mt-3 block',
          disabled
            ? 'text-parchment-4'
            : cn(primary ? 'text-gold-lit' : 'text-parchment', 'group-hover:text-gold-lit'),
        )}
      >
        {title}
      </span>

      <span
        className={cn(
          'type-small mx-auto mt-2 block max-w-[40ch]',
          disabled ? 'text-parchment-4' : 'text-parchment-2',
        )}
      >
        {body}
      </span>

      <ArrowRight
        aria-hidden
        size={18}
        strokeWidth={1.5}
        className={cn(
          'mx-auto mt-4 block transition-transform duration-move ease-rise',
          'sm:absolute sm:right-6 sm:top-1/2 sm:mx-0 sm:mt-0 sm:-translate-y-1/2',
          disabled ? 'text-parchment-4' : 'text-gold group-hover:translate-x-1 group-hover:text-gold-lit',
        )}
      />
    </button>
  );
}
