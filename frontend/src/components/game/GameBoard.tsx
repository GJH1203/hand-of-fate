'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import PlayerHand from './PlayerHand';
import { OwnerMark } from './Pips';
import BoardGrid from './arena/BoardGrid';
import { useGameState } from '@/hooks/useGameState';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { apiFetch } from '@/lib/apiClient';
import { readableState } from '@/lib/game/matchView';
import { cn } from '@/lib/utils';
import { playerService } from '@/services/playerService';
import { Card, GameState, Position } from '@/types/game';

const DEFAULT_BOARD_WIDTH = 3;  // Adjusted to match backend
const DEFAULT_BOARD_HEIGHT = 5; // Adjusted to match backend
const CELLS = DEFAULT_BOARD_WIDTH * DEFAULT_BOARD_HEIGHT;

/**
 * THE TRIPTYCH ORNAMENT. Three rules, the middle one heavier: a centre panel
 * between two wings. It is the shape of the board — three columns, and you win
 * by taking two of them — used as the mark that separates a title from what
 * follows it, exactly as the duel-starting screen sets it.
 */
function Triptych() {
  return (
    <span aria-hidden className="mt-5 flex items-center justify-center gap-2">
      <span className="block h-px w-6 bg-gold-deep" />
      <span className="block h-[2px] w-10 bg-gold" />
      <span className="block h-px w-6 bg-gold-deep" />
    </span>
  );
}

/**
 * A card in miniature, which is what a legend on this board has to be.
 *
 * A colour chip would state the weakest of the four ownership channels and none
 * of the three strong ones — gold against silver measures about 1.25:1. This
 * states the ones that carry the meaning: the FIGURE is a rayed sun for Sol and
 * a crescent for Luna, it sits at the FOOT of Sol's cards and the HEAD of
 * Luna's, and Sol's is framed twice.
 *
 * The arena's top bar draws the same swatch and does not export it; this is the
 * same mark rather than a second invention of one.
 */
function MarkSwatch({ mine }: { mine: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block h-7 w-5 shrink-0 rounded-arch border-rule bg-night-1',
        mine ? 'border-gold' : 'border-luna-deep',
      )}
    >
      {mine && <span className="absolute inset-[2px] rounded-arch border-hair border-gold-deep" />}
      <OwnerMark
        mine={mine}
        className={cn(
          'absolute left-1/2 h-2 w-2 -translate-x-1/2',
          mine ? 'bottom-[3px] text-gold' : 'top-[3px] text-luna',
        )}
      />
    </span>
  );
}

/** A section head: Roman capitals on the axis, over a gilt rule. */
function SlipHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="type-label border-b-rule border-gold-deep pb-1.5 text-center text-parchment">
      {children}
    </h2>
  );
}

/** Label left, figure right, hairline under. Every figure is Spectral and tabular. */
function TallyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-hair border-gold-deep py-1.5">
      <dt className="type-label text-parchment-3">{label}</dt>
      <dd className="type-num text-[13px] text-parchment">{value}</dd>
    </div>
  );
}

/**
 * The local board: one duel, both hands, one device.
 *
 * SOL IS WHOEVER IS TO MOVE, and that is the one thing about this screen that is
 * not the online arena. There is no stable "you" here — every turn is taken at
 * the same board, and the server sends the hand of the player on turn — so the
 * perspective belongs to the player on turn. The cards they own carry the gold
 * sun at the foot, the other player's carry the silver crescent at the head, and
 * both marks change hands when the turn does. Every ownership decision below
 * reads `gameState.currentPlayerId` for exactly that reason.
 */
export default function GameBoard() {
  const { gameState, isLoading, error, initializeGame, makeMove, requestWin, respondToWinRequest } = useGameState();
  const { isAuthenticated, user } = useUnifiedAuth();
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [boardCards, setBoardCards] = useState<Record<string, Card>>({});
  const [showOpponentSelection, setShowOpponentSelection] = useState(true);
  const [opponentName, setOpponentName] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [players, setPlayers] = useState<{[key: string]: string}>({});
  const [cardOwnership, setCardOwnership] = useState<{[key: string]: string}>({});

  // Effect to get actual card data for pieces on the board
  useEffect(() => {
    if (gameState && gameState.board.pieces && gameState.placedCards) {
      const cardMap: Record<string, Card> = {};

      Object.entries(gameState.board.pieces).forEach(([posKey, cardId]) => {
        // Get the actual card data from placedCards
        const card = gameState.placedCards[cardId];
        if (card) {
          cardMap[posKey] = card;
        } else {
          // Fallback to mock card if not found
          cardMap[posKey] = {
            id: String(cardId),
            name: `Card ${cardId}`,
            power: 5
          };
        }
      });

      setBoardCards(cardMap);

      // Update player names from gameState if available
      if (gameState.playerNames && Object.keys(gameState.playerNames).length > 0) {
        setPlayers(gameState.playerNames);
      }

      // Update card ownership from gameState
      if (gameState.cardOwnership) {
        setCardOwnership(gameState.cardOwnership);
      }
    }
  }, [gameState]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const createGameWithOpponent = async () => {
    if (!opponentName.trim() || !user) {
      return;
    }

    try {
      setIsCreatingGame(true);

      // Get current player data
      const currentPlayerData = await playerService.getPlayer(user.playerId);

      // Get opponent data
      const opponentData = await playerService.getPlayerByUsername(opponentName);

      // Store player names
      setPlayers({
        [currentPlayerData.id]: currentPlayerData.name,
        [opponentData.id]: opponentData.name
      });

      // Check if players have decks, create them if missing
      if (!currentPlayerData.currentDeck) {
        const createDeckResponse = await apiFetch(`/players/${currentPlayerData.id}/create-deck`, {
          method: 'POST'
        });
        if (createDeckResponse.ok) {
          const updatedPlayerData = await createDeckResponse.json();
          Object.assign(currentPlayerData, updatedPlayerData);
        } else {
          throw new Error('Failed to create deck for current player');
        }
      }

      if (!opponentData.currentDeck) {
        const createDeckResponse = await apiFetch(`/players/${opponentData.id}/create-deck`, {
          method: 'POST'
        });
        if (createDeckResponse.ok) {
          const updatedOpponentData = await createDeckResponse.json();
          Object.assign(opponentData, updatedOpponentData);
        } else {
          throw new Error(`Failed to create deck for opponent "${opponentName}"`);
        }
      }

      // Final check that both players have valid decks
      if (!currentPlayerData.currentDeck || !currentPlayerData.currentDeck.id) {
        throw new Error('Current player still missing deck after creation attempt');
      }
      if (!opponentData.currentDeck || !opponentData.currentDeck.id) {
        throw new Error('Opponent still missing deck after creation attempt');
      }

      // Start game with both players
      await initializeGame(
        currentPlayerData.id,
        opponentData.id,
        currentPlayerData.currentDeck.id,
        opponentData.currentDeck.id
      );

      // Initialize card ownership tracking
      // Player1 starts with card at (1,3), Player2 at (1,1)
      setCardOwnership({
        '1,3': currentPlayerData.id,  // Player1's initial position
        '1,1': opponentData.id        // Player2's initial position
      });

      setShowOpponentSelection(false);
      setSelectedCard(null);
      setValidMoves([]);
    } catch (err) {
      console.error('Failed to create game:', err);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const startNewGame = () => {
    setShowOpponentSelection(true);
    setOpponentName('');
    setSelectedCard(null);
    setValidMoves([]);
    setCardOwnership({});
  };

  const handleCardSelect = (card: Card | null) => {
    setSelectedCard(card);
    if (card && gameState) {
      // Calculate valid moves when a card is selected
      setValidMoves(calculateValidMoves(gameState));
    } else {
      setValidMoves([]);
    }
  };

  const calculateValidMoves = (gameState: GameState): Position[] => {
    const positions: Position[] = [];
    const boardPieces = gameState.board.pieces || {};

    // Since we don't have reliable ownership data from the backend yet,
    // let's use a simple approach: determine ownership based on game rules

    // For now, we'll determine ownership based on the known initial positions:
    // Player 1 starts at (1,3), Player 2 starts at (1,1)
    // Then track ownership based on who made subsequent moves

    // Get list of all players from the game
    // Use our tracked card ownership information
    const getCardOwnership = (posKey: string): string | null => {
      return cardOwnership[posKey] || null;
    };

    // Find positions adjacent to current player's own cards only
    Object.entries(boardPieces).forEach(([posKey]: [string, string]) => {
      const [x, y] = posKey.split(',').map(Number);

      // Skip if we couldn't parse the position
      if (isNaN(x) || isNaN(y)) {
        console.error('Invalid position key:', posKey);
        return;
      }

      // Check if this card belongs to the current player
      const cardOwner = getCardOwnership(posKey);
      const isOwnCard = cardOwner === gameState.currentPlayerId;

      if (!isOwnCard) {
        return;
      }

      // Check only orthogonal adjacent positions (no diagonals)
      const orthogonalPositions = [
        { x: x-1, y: y }, // left
        { x: x+1, y: y }, // right
        { x: x, y: y-1 }, // top
        { x: x, y: y+1 }  // bottom
      ];

      orthogonalPositions.forEach(pos => {
        // Check if position is valid (within board bounds and empty)
        if (pos.x >= 0 && pos.x < DEFAULT_BOARD_WIDTH &&
            pos.y >= 0 && pos.y < DEFAULT_BOARD_HEIGHT &&
            !boardPieces[`${pos.x},${pos.y}`]) {
          positions.push(pos);
        }
      });
    });

    // Remove duplicates
    const uniquePositions = positions.filter((pos, index, self) =>
      index === self.findIndex(p => p.x === pos.x && p.y === pos.y)
    );
    return uniquePositions;
  };

  const handleCellClick = async (position: Position) => {
    // Check if this is an empty position
    const positionKey = `${position.x},${position.y}`;
    const isOccupied = gameState?.board.pieces && gameState.board.pieces[positionKey];

    if (!selectedCard || !gameState || isOccupied) {
      return;
    }

    try {
      // Call the backend to make the move
      await makeMove(
        gameState.id,
        gameState.currentPlayerId,
        selectedCard,
        position
      );

      // Track the ownership of the newly placed card
      setCardOwnership(prev => ({
        ...prev,
        [positionKey]: gameState.currentPlayerId
      }));

      // Reset selection after a successful move
      setSelectedCard(null);
      setValidMoves([]);
    } catch (err) {
      console.error('Failed to make move:', err);
    }
  };

  if (isLoading) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <div className="panel w-full max-w-[30rem] px-8 pb-10 pt-12 text-center">
          <p role="status" className="type-label text-parchment-3">
            Opening the board
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
            Waiting for the server to answer.
          </p>
        </div>
      </main>
    );
  }

  if (!gameState && showOpponentSelection) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-[44rem] flex-col justify-center px-4 py-10 sm:px-8 sm:py-14"
      >
        {/*
         * One panel, cut square. An arch marks a niche — something that holds a
         * figure — and a full-page container is not one: arched, this reads as a
         * headstone.
         */}
        <div className="panel px-6 pb-12 pt-12 text-center sm:px-14 sm:pb-14 sm:pt-14">
          <header>
            <p className="type-label text-gold">Local duel</p>
            <h1 className="type-h1 mt-5 text-parchment">Hand of Fate</h1>
            <Triptych />
            <p className="type-body mx-auto mt-6 text-parchment-2">
              Name the player you are sitting down against. Both turns are taken at this
              board, so the hand on show belongs to whoever is on turn.
            </p>
          </header>

          <p className="mt-7">
            <span className="cartouche cartouche--sol">
              <OwnerMark mine className="h-3 w-3 shrink-0" />
              <span className="truncate">Playing as {user?.username}</span>
            </span>
          </p>

          {/*
           * Set left, because a field and its correction are read like prose
           * however axial the panel around them is.
           */}
          <div className="mx-auto mt-10 max-w-[26rem] text-left">
            <label htmlFor="opponent" className="type-label block text-parchment-2">
              Opponent
            </label>
            <input
              id="opponent"
              type="text"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="Their registered name"
              className="field-input mt-2.5"
            />
            <p className="type-small mt-2 text-parchment-3">
              They must already have an account on this server.
            </p>

            <button
              type="button"
              onClick={createGameWithOpponent}
              disabled={!opponentName.trim() || isCreatingGame}
              className="btn btn--key mt-6 h-11 w-full"
            >
              {isCreatingGame ? 'Opening the board' : 'Start the duel'}
            </button>
          </div>

          {error && (
            /*
             * A rubric, not a red pill. The server's own words go in the slip
             * unedited; the cinnabar bar down its leading edge is what says
             * something is wrong, so nothing has to borrow a player's metal.
             */
            <div role="alert" className="rubric mx-auto mt-8 max-w-[26rem] text-left">
              <p className="type-micro text-cinnabar">The server&apos;s words</p>
              <p className="type-small mt-1.5 text-parchment">{error}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!gameState) {
    /*
     * Selection is behind us and no board arrived. `initializeGame` swallows its
     * own failure and records it in `error`, so this is where a duel that could
     * not be opened lands — and printing the reason is the least this screen can
     * do about it.
     */
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <div className="panel w-full max-w-[30rem] px-8 pb-10 pt-12 text-center">
          <p className="type-label text-parchment-3">The board</p>
          <h1 className="type-h2 mt-4 text-parchment">
            {error ? 'This duel could not be opened' : 'Waiting for the board'}
          </h1>
          {error ? (
            <div role="alert" className="rubric mt-6 text-left">
              <p className="type-micro text-cinnabar">The server&apos;s words</p>
              <p className="type-small mt-1.5 text-parchment">{error}</p>
            </div>
          ) : (
            <span
              aria-hidden
              className="mx-auto mt-5 block h-[2px] w-24 bg-gold"
              style={{ animation: 'ink-pulse 1.5s ease-in-out infinite' }}
            />
          )}
        </div>
      </main>
    );
  }

  const toMoveId = gameState.currentPlayerId;
  const toMoveName = players[toMoveId] || toMoveId;
  const waitingId = Object.keys(players).find((id) => id !== toMoveId);
  const waitingName = (waitingId && players[waitingId]) || 'Opponent';
  const isFinished = gameState.state === 'COMPLETED';
  const iAskedToEnd =
    !!gameState.hasPendingWinRequest && gameState.pendingWinRequestPlayerId === toMoveId;
  const onBoard = Object.keys(gameState.board.pieces ?? {}).length;
  const named = Object.entries(players);

  return (
    <main id="main" className="mx-auto w-full max-w-[76rem] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 text-center">
        <p className="type-label text-gold">Local duel</p>
        <h1 className="type-h1 mt-3 text-parchment">Hand of Fate</h1>
        <Triptych />
        <p className="type-small mx-auto mt-4 max-w-[52ch] text-parchment-2">
          Both turns are taken at this board. Whoever is on turn holds Sol, and their
          cards carry a gold sun at the foot.
        </p>
      </header>

      {/*
       * TWO PANELS STANDING IN THE FIRMAMENT, the way the online arena stands: a
       * wide one carrying the head, the arcade, the board and the hand, and a
       * narrow one beside it carrying the tally, with the night showing between
       * them. Unlike the arena this page is allowed to flow — there is no socket
       * to keep on screen and no second player watching a clock — so the cell
       * size is a clamp against the viewport width rather than a subtraction from
       * its height.
       */}
      <div
        className="mx-auto grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
        style={{ '--cell': 'clamp(52px, 9vw, 92px)' } as React.CSSProperties}
      >
        <section className="panel grid grid-cols-[2.25rem_minmax(0,1fr)] overflow-hidden">
          {/*
           * The margin line. Marginalia: no tooltip, no link, nothing anywhere in
           * the UI explaining it. It happens to carry the game id, which is the
           * string you would read out if you were reporting a problem.
           */}
          <div className="flex items-center justify-center overflow-hidden border-r-hair border-r-gold-deep">
            <p className="margin-line type-micro whitespace-nowrap">
              HAND OF FATE · III COLONNES · V RANGS · {gameState.id}
            </p>
          </div>

          <div className="min-w-0">
            {/*
             * Three columns with the middle one on the axis, because the thing
             * that matters most on this bar — whose hour it is — belongs on the
             * centre line of the board it sits over.
             */}
            <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b-rule border-gold-deep px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-4">
                <button type="button" onClick={startNewGame} className="btn btn--quiet h-8 px-2.5">
                  New duel
                </button>

                {/*
                 * The legend, stated here once rather than on all fifteen
                 * squares — which is what lets a card on the board carry no name
                 * plate at all. The swatches are hidden from the accessibility
                 * tree and given in words instead, because a shape is the whole
                 * point of them and a shape does not read aloud.
                 *
                 * It appears at xl and not before. Below that the wide panel is
                 * about 600px of usable bar, and the legend, the hour and the
                 * early-end cartouche together do not fit in it without one of
                 * them being cut in half.
                 */}
                <div className="hidden min-w-0 items-center gap-4 border-l-hair border-gold-deep pl-4 xl:flex">
                  <span className="flex min-w-0 items-center gap-2">
                    <MarkSwatch mine />
                    <span className="type-label max-w-[12ch] truncate text-gold-lit">
                      {toMoveName}
                    </span>
                    <span className="sr-only">
                      Sol. The cards of the player on turn carry a gold sun at the foot.
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <MarkSwatch mine={false} />
                    <span className="type-label max-w-[12ch] truncate text-luna">
                      {waitingName}
                    </span>
                    <span className="sr-only">
                      Luna. The waiting player&apos;s cards carry a silver crescent at the head.
                    </span>
                  </span>
                </div>
              </div>

              {/*
               * The hour, on the axis, haloed. The aureole is concentric drawn
               * rings rather than a glow, and it belongs to whoever is to move —
               * so it stays put and the name inside it changes hands. It is gold
               * either way, which is right rather than sloppy: in icon painting
               * every halo is gold whoever wears it, because the light is not the
               * figure's own.
               */}
              <div className="flex items-center justify-center">
                {isFinished ? (
                  <span className="cartouche">Duel finished</span>
                ) : (
                  <span className="aureole cartouche cartouche--sol max-w-[24ch]">
                    <OwnerMark mine className="h-3 w-3 shrink-0" />
                    <span className="truncate">{toMoveName} to move</span>
                  </span>
                )}
              </div>

              <div className="flex min-w-0 items-center justify-end">
                {/* A pending request is a state, not a correction, so it stays off the red. */}
                {gameState.hasPendingWinRequest && (
                  <span className="cartouche min-w-0">
                    <span className="truncate">Early end asked</span>
                  </span>
                )}
              </div>
            </header>

            {/*
             * Capped and centred, so the board and the hand share one measure and
             * one centre line. A triptych is axial or it is nothing.
             */}
            <div className="mx-auto grid w-full max-w-[760px] gap-3 p-4">
              {/*
               * gap-3 is load-bearing: the arcade of arches pulls itself down onto
               * the gilded field with a -23px margin measured against a 12px grid
               * gap, so the strip and the board read as one wall pierced at the
               * head. A finished board is dimmed and inert, the way it was before.
               */}
              <div className={cn('grid gap-3', isFinished && 'pointer-events-none opacity-50')}>
                <BoardGrid
                  cards={boardCards}
                  ownership={cardOwnership}
                  columnScores={gameState.columnScores ?? {}}
                  players={players}
                  currentPlayerId={toMoveId}
                  validMoves={validMoves}
                  selectedCard={selectedCard}
                  playable={!isFinished}
                  onPlace={(x, y) => handleCellClick({ x, y })}
                />
              </div>

              {/*
               * The hand is a well rather than a second panel. The cards are night
               * with gilt frames, so the tray they lie in steps the other way —
               * otherwise five framed cards sit on a surface of their own value
               * and the hand reads as a list rather than as cards put down.
               */}
              <div className="flex flex-col border-rule border-gold-deep bg-night-3 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-4">
                  {/* Interpuncts, the way a lapidary inscription separates words. */}
                  <span className="interpunct flex items-baseline">
                    <span className="type-label text-parchment-2">Hand on turn</span>
                    {/* A count is a number, so it is set in Spectral whatever it sits beside. */}
                    <span className="type-num text-[11px] tracking-[0.08em] text-parchment-3">
                      {gameState.currentPlayerHand?.length || 0} left
                    </span>
                  </span>

                  {gameState.state === 'IN_PROGRESS' && !gameState.hasPendingWinRequest && (
                    <button
                      type="button"
                      className="btn btn--quiet h-8 px-3"
                      onClick={() => requestWin(gameState.id, gameState.currentPlayerId)}
                    >
                      End early
                    </button>
                  )}
                </div>

                <PlayerHand
                  cards={gameState.currentPlayerHand || []}
                  isCurrentTurn={gameState.state === 'IN_PROGRESS'}
                  selectedCard={selectedCard}
                  onCardSelect={gameState.state === 'IN_PROGRESS' ? handleCardSelect : () => {}}
                />

                {selectedCard && (
                  <p className="type-small mt-2 text-center text-parchment-2">
                    Holding {selectedCard.name}, worth{' '}
                    <span className="type-num">{selectedCard.power}</span>. Set it down on one of
                    the squares showing the stars you would lay.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* THE NARROW PANEL — the tally, and anything the board cannot say itself. */}
        <aside className="panel px-4 py-4">
          {error && (
            /*
             * A rubric, not a red box. Whatever the server or a thrown Error put
             * in this string, it is a correction to the page — and it cannot be
             * in either player's metal, because both are spoken for on this
             * screen.
             */
            <div role="alert" className="rubric type-small mb-5 text-[13px] text-parchment-2">
              {error}
            </div>
          )}

          {isFinished && (
            <>
              <SlipHead>The verdict</SlipHead>
              <div className="mb-5 pt-3.5 text-center">
                {gameState.isTie ? (
                  <>
                    <p className="type-h2 text-parchment">A draw</p>
                    {/* Both metals together, never a third invented for the occasion. */}
                    <span aria-hidden className="mx-auto mt-3 block w-20">
                      <span className="block h-px bg-gold" />
                      <span className="mt-[3px] block h-px bg-luna" />
                    </span>
                    <p className="type-small mt-3.5 text-parchment-2">
                      Both players took the same number of columns.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="type-micro text-parchment-3">Winner</p>
                    {/*
                     * Parchment, and the gilding is the rule beneath. Sol and Luna
                     * belong to whoever is on turn on this screen, so inscribing a
                     * winner in either metal would say something the board has
                     * already stopped meaning.
                     */}
                    <p className="type-h2 mt-1.5 text-parchment">
                      {players[gameState.winnerId || ''] || gameState.winnerId}
                    </p>
                    <span aria-hidden className="mx-auto mt-3 block h-[2px] w-20 bg-gold" />
                  </>
                )}

                {gameState.scores && (
                  <ul className="mt-5 border-t-hair border-gold-deep text-left">
                    {Object.entries(gameState.scores).map(([playerId, score]) => (
                      <li
                        key={playerId}
                        className="flex items-baseline justify-between gap-3 border-b-hair border-gold-deep py-1.5"
                      >
                        <span className="type-small min-w-0 truncate text-parchment">
                          {players[playerId] || playerId}
                        </span>
                        <span className="shrink-0 whitespace-nowrap">
                          <span className="type-num text-[15px] text-parchment">{score}</span>{' '}
                          <span className="type-micro text-parchment-3">
                            column{score !== 1 ? 's' : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {gameState.hasPendingWinRequest && (
            <>
              <SlipHead>Early end</SlipHead>
              <div className="note mb-5 mt-3">
                {iAskedToEnd ? (
                  <>
                    <p className="type-small text-parchment-2">
                      <span className="text-parchment">{toMoveName}</span> has asked to stop here
                      and count the columns as they stand.
                    </p>
                    {/*
                     * The mark loops because the honest answer is that this is a
                     * wait on somebody else, and it is struck in silver because
                     * the somebody else is Luna.
                     */}
                    <p className="type-micro mt-3 flex items-center gap-2 text-parchment-3">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 bg-luna"
                        style={{ animation: 'ink-pulse 1.4s ease-in-out infinite' }}
                      />
                      Waiting for an answer
                    </p>
                  </>
                ) : (
                  <>
                    <p className="type-small text-parchment-2">
                      <span className="text-parchment">
                        {players[gameState.pendingWinRequestPlayerId || ''] || 'The other player'}
                      </span>{' '}
                      proposes to stop here and count the columns as they stand.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        className="btn btn--quiet h-9 px-3"
                        onClick={() =>
                          respondToWinRequest(gameState.id, gameState.currentPlayerId, false)
                        }
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        className="btn btn--key h-9 px-3"
                        onClick={() =>
                          respondToWinRequest(gameState.id, gameState.currentPlayerId, true)
                        }
                      >
                        Agree and end
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <SlipHead>Players</SlipHead>
          <div className="mb-5">
            {named.length === 0 ? (
              <p className="type-small mt-2 text-parchment-3">No names have arrived yet.</p>
            ) : (
              named.map(([playerId, name], index) => {
                const isToMove = playerId === toMoveId;
                const columns = gameState.scores?.[playerId] ?? 0;

                return (
                  <div
                    key={playerId}
                    className={cn(
                      // The turn marker is a heavy rule down the leading edge in
                      // Sol's metal — the transparent one on the idle row keeps
                      // both names on the same measure.
                      'flex items-center gap-2.5 border-l-heavy py-2 pl-2.5',
                      index > 0 && 'border-t-hair border-t-gold-deep',
                      isToMove ? 'border-l-gold' : 'border-l-transparent',
                    )}
                  >
                    <MarkSwatch mine={isToMove} />

                    <span className="min-w-0 flex-1">
                      <span className="type-small block truncate">{name}</span>
                      {isToMove && (
                        <span className="type-micro block text-parchment-3">To move</span>
                      )}
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="type-num block text-[15px] leading-none text-parchment">
                        {columns}
                      </span>
                      <span className="type-micro block text-parchment-3">
                        column{columns === 1 ? '' : 's'}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <SlipHead>Where it stands</SlipHead>
          <dl>
            <TallyRow
              label="State"
              value={<span className="type-label">{readableState(gameState.state).label}</span>}
            />
            <TallyRow label="Cards in hand" value={gameState.currentPlayerHand?.length || 0} />
            {/* Out of fifteen, because a tally says what it is counting against. */}
            <TallyRow label="Cards on board" value={`${onBoard}/${CELLS}`} />
          </dl>
        </aside>
      </div>
    </main>
  );
}
