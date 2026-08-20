'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Swords } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Modal } from '@/components/ui/modal';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Spinner } from '@/components/ui/spinner';
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
    document.title = 'Battle | Hand of Fate';
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
      <main className="flex min-h-dvh items-center justify-center px-6">
        <Panel className="w-full max-w-md">
          <PanelBody>
            <InlineAlert tone="danger">{match.fatalError}</InlineAlert>
            <Button variant="secondary" className="mt-5 w-full" onClick={onBack}>
              <ArrowLeft size={16} strokeWidth={1.75} />
              Back to Menu
            </Button>
          </PanelBody>
        </Panel>
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
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Spinner size={28} className="text-arcane-300" />
        <p className="type-small text-ink-low">Opening the arena…</p>
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

  return (
    <>
      {/*
       * The arena is a fixed two-column viewport layout and there is no phone
       * version of it yet. Saying so is better than serving a board four cells
       * wide and letting somebody find out mid-duel.
       */}
      <main className="flex min-h-dvh items-center justify-center px-6 lg:hidden">
        <Panel className="w-full max-w-sm">
          <PanelBody className="text-center">
            <Swords size={28} strokeWidth={1.75} className="mx-auto text-gold-400" />
            <h1 className="type-h2 mt-4 text-ink-hi">Best played on a desktop</h1>
            <p className="type-small mt-2 text-ink-mid">
              The arena needs a window at least 1024 pixels wide to show the board and your hand
              at once. Your battle is safe — open this page on a larger screen to continue it.
            </p>
            <Button variant="secondary" className="mt-5 w-full" onClick={onBack}>
              <ArrowLeft size={16} strokeWidth={1.75} />
              Back to Menu
            </Button>
          </PanelBody>
        </Panel>
      </main>

      <div className="hidden h-dvh grid-rows-[56px_1fr] overflow-hidden lg:grid">
        <ArenaTopBar
          connection={match.connectionStatus}
          isMyTurn={match.isMyTurn}
          opponentName={(opponentId && match.players[opponentId]) || 'Opponent'}
          roomCode={matchInfo ? roomCodeOf(matchInfo.matchId) : null}
          earlyEndPending={!!gameState.hasPendingWinRequest}
          onLeave={() => (isFinished ? leaveForMenu() : setConfirmLeave(true))}
        />

        <div className="grid min-h-0 grid-cols-[1fr_300px] gap-4 p-4">
          <div
            /*
             * The board has to fit whatever is left after the bar, the column headers
             * and the hand, so the cell size is derived rather than guessed. Each part
             * of that subtraction is a variable, and the hand panel is pinned to
             * --hand, so the two cannot drift apart and start overlapping.
             */
            className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3"
            style={
              {
                '--bar': '56px',
                '--pad': '32px',
                '--headers': '44px',
                '--gaps': '24px',
                '--hand': '180px',
                '--cell':
                  'clamp(48px, calc((100dvh - var(--bar) - var(--pad) - var(--headers) - var(--gaps) - var(--hand) - 32px) / 5), 96px)',
              } as React.CSSProperties
            }
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

      <Modal
        open={theyAskedToEnd && !isFinished}
        onClose={() => match.answerEarlyEnd(false)}
        title="End the duel now?"
        showCloseButton={false}
        closeOnOverlayClick={false}
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-ink-mid">
          Your opponent proposes to end early and count the columns as they stand.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => match.answerEarlyEnd(false)}>
            Decline
          </Button>
          <Button variant="primary" onClick={() => match.answerEarlyEnd(true)}>
            Agree &amp; End
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave the battle?"
        widthClassName="max-w-sm"
      >
        <p className="text-sm text-ink-mid">
          The duel is still in progress. Leaving now counts as abandoning it.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={leaveForMenu}>
            Leave
          </Button>
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
