'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { outcomeFor, roomCodeOf } from '@/lib/game/matchView';
import GameLobby from './GameLobby';
import GameResultModal from './GameResultModal';
import ArenaTopBar from './arena/ArenaTopBar';
import BoardGrid from './arena/BoardGrid';
import HandPanel from './arena/HandPanel';
import MatchSidebar from './arena/MatchSidebar';
import { useOnlineMatch } from './arena/useOnlineMatch';

interface OnlineGameBoardProps {
  matchId?: string;
  onBack: () => void;
}

/**
 * The arena: one viewport, no scrolling, for the length of a duel.
 *
 * This file composes; it does not decide. Everything about talking to the server
 * lives in `useOnlineMatch`, everything about the rules in `lib/game`, and each
 * region of the screen in its own component under `arena/`. It was a single
 * thousand-line component doing all three, which is why nothing in it could be
 * read, changed or tested on its own.
 *
 * What it does decide is the furniture: TWO PANELS STANDING IN THE FIRMAMENT. A
 * wide one carrying the head, the arcade, the board and the hand, and a narrow
 * one beside it carrying the tally, with the night sky showing between them and
 * around them both. The arena before this ran one flat surface to all four edges
 * of the viewport, which is a background colour wearing a costume — a panel has
 * dimensions, and this is the screen where having them has to earn its keep.
 */
export default function OnlineGameBoard({ matchId, onBack }: OnlineGameBoardProps) {
  const { isAuthenticated, user } = useUnifiedAuth();
  const router = useRouter();
  const toast = useToast();

  const match = useOnlineMatch(matchId, user?.playerId);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // The tab says what you are looking at.
  useEffect(() => {
    const previous = document.title;
    document.title = 'Duel | Hand of Fate';
    return () => {
      document.title = previous;
    };
  }, []);

  const leaveForMenu = () => {
    match.leave();
    onBack();
  };

  const { gameState, matchInfo } = match;

  if (match.fatalError) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <div className="panel w-full max-w-[30rem] px-8 pb-10 pt-12 text-center">
          <p className="type-label text-parchment-3">The arena</p>
          <h1 className="type-h2 mt-4 text-parchment">This duel could not be opened</h1>
          {/*
           * A rubric, not a red pill. The server's own words go in the slip
           * unedited; the cinnabar bar down its leading edge is what says
           * something is wrong, so nothing has to borrow a player's metal to say
           * it. It is set left, because a correction is read like a line of prose
           * however axial the panel around it is.
           */}
          <div className="rubric mt-6 text-left">
            <p className="type-micro text-cinnabar">The server&apos;s words</p>
            <p className="type-small mt-1.5 text-parchment">{match.fatalError}</p>
          </div>
          <button type="button" className="btn btn--key mt-8 h-11 px-5" onClick={onBack}>
            <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
            Back to the menu
          </button>
        </div>
      </main>
    );
  }

  if (match.isInLobby && matchInfo) {
    return (
      <GameLobby
        matchInfo={matchInfo}
        currentPlayerId={user!.playerId}
        onGameStart={match.startFromLobby}
        onCancel={leaveForMenu}
      />
    );
  }

  if (match.isLoading || !gameState) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <div className="panel w-full max-w-[30rem] px-8 pb-10 pt-12 text-center">
          <p role="status" className="type-label text-parchment-3">
            Opening the arena
          </p>
          {/*
           * The only loop the system allows, and only because the honest answer
           * here is "we are still waiting". Nothing else in this interface moves
           * of its own accord.
           */}
          <span
            aria-hidden
            className="mx-auto mt-5 block h-[2px] w-24 bg-gold"
            style={{ animation: 'ink-pulse 1.5s ease-in-out infinite' }}
          />
          <p className="type-body mx-auto mt-6 text-parchment-2">
            Waiting for the server to send the board. It is asked again every second
            until it answers.
          </p>
        </div>
      </main>
    );
  }

  const me = user!.playerId;
  const opponentId = Object.keys(match.players).find((id) => id !== me);
  const isFinished = gameState.state === 'COMPLETED';
  const iAskedToEnd =
    !!gameState.hasPendingWinRequest && gameState.pendingWinRequestPlayerId === me;
  const theyAskedToEnd =
    !!gameState.hasPendingWinRequest && gameState.pendingWinRequestPlayerId !== me;

  /*
   * The margin line carries whichever identifier actually names this game to the
   * server, in that order of preference — it is the string you would read out if
   * you were reporting a problem, and the room code in the head is not it.
   */
  const marginId = matchInfo?.matchId ?? matchId ?? gameState.id;

  return (
    <>
      {/*
       * The arena is a fixed two-panel viewport layout and there is no phone
       * version of it yet. Saying so is better than serving a board four cells
       * wide and letting somebody find out mid-duel.
       */}
      <main className="flex min-h-dvh items-center justify-center p-4 lg:hidden">
        <div className="panel w-full max-w-[26rem] px-8 pb-10 pt-12 text-center">
          <p className="type-label text-gold">The arena</p>
          <h1 className="type-h2 mt-4 text-parchment">Best played on a desktop</h1>
          <hr className="mx-auto mt-4 w-24 border-0 border-t-rule border-t-gold-deep" />
          <p className="type-body mx-auto mt-5 text-parchment-2">
            The board and your hand stand on one panel, and that panel needs a window
            at least <span className="type-num">1024</span> pixels wide. Your duel is
            safe — open this page on a larger screen to carry on with it.
          </p>
          <button type="button" className="btn mt-8 h-11 px-5" onClick={onBack}>
            <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
            Back to the menu
          </button>
        </div>
      </main>

      {/*
       * `id="main"` sits on the desktop arena rather than the fallback above,
       * because both are in the DOM at once and only one of them may hold it.
       */}
      <main id="main" className="hidden h-dvh overflow-hidden px-5 py-4 lg:block">
        <div
          /*
           * The board has to fit whatever is left after the head, the column
           * scores and the hand, so the cell size is derived rather than guessed.
           * Each part of that subtraction is a named variable, and the hand panel
           * is pinned to --hand, so the two cannot drift apart and start
           * overlapping.
           *
           * --hand is 208px and every pixel of it is accounted for: 24 of panel
           * padding, 40 for the label row and its margin, 128 for a card, and 14
           * for the lift a selected card takes. It was 180, which is 26 short —
           * so picking up a card pushed the hand into the board's bottom row.
           * If the hand's furniture changes, this number changes with it.
           *
           * --pad is the only value that moved when the arena stopped being
           * full-bleed, from 32px to 64px: it used to cover one p-4 on the old
           * edge-to-edge body, and now covers the page's own gutter onto the night
           * (py-4, 32px) plus the panel's inner margin around the board column
           * (p-4, 32px). Every other term is unchanged, and the worst case is
           * still comfortable — at a 800px viewport height a cell is 80px, well
           * clear of the 48px floor, so the board and the hand fit with nothing
           * scrolling.
           */
          className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_20rem] gap-4"
          style={
            {
              '--bar': '56px',
              '--pad': '64px',
              '--headers': '44px',
              '--gaps': '24px',
              '--hand': '208px',
              '--cell':
                'clamp(48px, calc((100dvh - var(--bar) - var(--pad) - var(--headers) - var(--gaps) - var(--hand) - 32px) / 5), 112px)',
            } as React.CSSProperties
          }
        >
          {/* THE WIDE PANEL — the head, the arcade, the board, the hand. */}
          <section className="panel grid min-h-0 grid-cols-[2.25rem_minmax(0,1fr)] overflow-hidden">
            {/*
             * The margin line. Marginalia: no tooltip, no link, nothing anywhere
             * in the UI explaining it, and it is the entire ornament budget for
             * the product. It happens to carry the match id.
             */}
            <div className="flex items-center justify-center overflow-hidden border-r-hair border-r-gold-deep">
              <p className="margin-line type-micro whitespace-nowrap">
                HAND OF FATE · III COLONNES · V RANGS · {marginId}
              </p>
            </div>

            <div className="grid min-h-0 grid-rows-[var(--bar)_minmax(0,1fr)]">
              <ArenaTopBar
                connection={match.connectionStatus}
                isMyTurn={match.isMyTurn}
                opponentName={(opponentId && match.players[opponentId]) || 'Opponent'}
                roomCode={matchInfo ? roomCodeOf(matchInfo.matchId) : null}
                earlyEndPending={!!gameState.hasPendingWinRequest}
                onLeave={() => (isFinished ? leaveForMenu() : setConfirmLeave(true))}
              />

              <div
                /*
                 * Capped and centred, so the board and the hand share one measure
                 * and one centre line. Without it the board sat as a ~280px island
                 * in the middle of the panel while the hand under it stretched the
                 * full width — the two halves of the same screen on different
                 * measures, which is what made the arena read as unfinished on a
                 * wide monitor. A triptych is axial or it is nothing.
                 */
                className="mx-auto grid min-h-0 w-full max-w-[760px] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-4"
              >
                <BoardGrid
                  cards={match.boardCards}
                  ownership={match.cardOwnership}
                  columnScores={gameState.columnScores ?? {}}
                  players={match.players}
                  currentPlayerId={me}
                  validMoves={match.validMoves}
                  selectedCard={match.selectedCard}
                  playable={match.isMyTurn}
                  onPlace={match.placeCard}
                />

                <HandPanel
                  cards={gameState.currentPlayerHand}
                  selectedCard={match.selectedCard}
                  onSelect={match.setSelectedCard}
                  isMyTurn={match.isMyTurn}
                  isFinished={isFinished}
                  awaitingOpponent={iAskedToEnd}
                  earlyEndBlocked={theyAskedToEnd}
                  onPass={match.pass}
                  onRequestEarlyEnd={() => {
                    match.requestEarlyEnd();
                    toast('Early end requested — waiting for your opponent to agree.');
                  }}
                />
              </div>
            </div>
          </section>

          {/*
           * THE NARROW PANEL — the tally.
           *
           * This wrapper is a grid cell and nothing else: `MatchSidebar` renders
           * its own panel, and putting a second one here stacked two gilt frames
           * and two sets of padding on the same board. One grid row of
           * minmax(0,1fr) because the sidebar is the only column that scrolls,
           * and it can only do that against a bounded height.
           */}
          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)]">
            <MatchSidebar
              gameState={gameState}
              players={match.players}
              currentPlayerId={me}
              opponentConnected={match.opponentConnected}
              battleLog={match.battleLog}
              error={match.error}
            />
          </div>
        </div>
      </main>

      <Modal
        open={theyAskedToEnd && !isFinished}
        onClose={() => match.answerEarlyEnd(false)}
        title="End the duel now?"
        showCloseButton={false}
        closeOnOverlayClick={false}
        widthClassName="max-w-sm"
      >
        <p className="type-body text-parchment-2">
          Your opponent proposes to stop here and count the columns as they stand.
        </p>
        <div className="mt-7 flex justify-end gap-4">
          <button
            type="button"
            className="btn btn--quiet h-10 px-4"
            onClick={() => match.answerEarlyEnd(false)}
          >
            Decline
          </button>
          <button
            type="button"
            className="btn btn--key h-10 px-4"
            onClick={() => match.answerEarlyEnd(true)}
          >
            Agree and end
          </button>
        </div>
      </Modal>

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave the duel?"
        widthClassName="max-w-sm"
      >
        {/*
         * What leaving actually does, and nothing more. `leave()` sends
         * LEAVE_MATCH and closes the socket; the game document is untouched, so
         * the older copy — "leaving now counts as abandoning it" — described a
         * forfeit that does not exist anywhere on the server.
         */}
        <p className="type-body text-parchment-2">
          The duel is still in progress. Leaving closes your connection to it; the board
          stays exactly as it stands.
        </p>
        <div className="mt-7 flex justify-end gap-4">
          <button
            type="button"
            className="btn btn--quiet h-10 px-4"
            onClick={() => setConfirmLeave(false)}
          >
            Stay
          </button>
          <button type="button" className="btn btn--key h-10 px-4" onClick={leaveForMenu}>
            Leave
          </button>
        </div>
      </Modal>

      <GameResultModal
        open={isFinished && !resultDismissed}
        outcome={outcomeFor(gameState, me)}
        columnScores={gameState.columnScores ?? {}}
        players={match.players}
        currentPlayerId={me}
        columnsWon={gameState.scores ?? {}}
        onReturn={() => {
          setResultDismissed(true);
          leaveForMenu();
        }}
      />
    </>
  );
}
