'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiFetch } from '@/lib/apiClient';
import { humanizeJoinError } from '@/lib/joinErrors';
import {
  type ArtByName,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  cardsByPosition,
  learnArt,
  legalPlacements,
  positionKey,
} from '@/lib/game/board';
import { LOG_LENGTH, describeNewMoves } from '@/lib/game/matchView';
import { gameWebSocketService } from '@/services/gameWebSocketService';
import { onlineGameService } from '@/services/onlineGameService';
import type { Card, GameState, Position } from '@/types/game';
import type { OnlineMatchInfo } from '@/types/gameMode';

const DEBUG = process.env.NODE_ENV === 'development';

/** The socket is briefly not open right after a rejoin; asking once is not enough. */
const STATE_RETRY_MS = 800;
/** How long to wait for a board before admitting one is not coming. */
const STATE_DEADLINE_MS = 10_000;
/** A socket that has gone quiet must not leave a card sitting on the board for ever. */
const MOVE_DEADLINE_MS = 5_000;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * Everything the arena needs to play a match, and nothing about how it looks.
 *
 * This used to be the top half of a thousand-line component: socket lifecycle,
 * match initialisation, the optimistic move and its undo, the watchdogs, and the
 * board derivation, all sharing scope with the JSX. Separating them is what makes
 * either half readable — and it is why the pure parts of it now live in
 * `lib/game` with no React around them at all.
 */
export function useOnlineMatch(matchId: string | undefined, playerId: string | undefined) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchInfo, setMatchInfo] = useState<OnlineMatchInfo | null>(null);
  const [isInLobby, setIsInLobby] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardOwnership, setCardOwnership] = useState<Record<string, string>>({});
  const [players, setPlayers] = useState<Record<string, string>>({});
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(true);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A failure that ends the screen — a bad code, a match that would not open. */
  const [fatalError, setFatalError] = useState<string | null>(null);

  // The board as the server last described it, so a new state can be diffed into a log.
  const previousPieces = useRef<Record<string, string> | null>(null);
  const art = useRef<ArtByName>({});

  /*
   * A move the player has made that the server has not confirmed yet. The board shows
   * it immediately — waiting for the round trip is a third of a second of a card not
   * appearing where it was dropped — so this holds what to put back if the server
   * refuses it, or never answers.
   */
  const pendingMove = useRef<{
    revertTo: GameState;
    ownershipBefore: Record<string, string>;
    timer: number;
  } | null>(null);

  const firstStateTimer = useRef<number | null>(null);
  const firstStateRetry = useRef<number | null>(null);

  const settleFirstState = useCallback(() => {
    window.clearTimeout(firstStateTimer.current ?? undefined);
    window.clearInterval(firstStateRetry.current ?? undefined);
    firstStateTimer.current = null;
    firstStateRetry.current = null;
  }, []);

  /**
   * Waits for the server to describe the game, and says so if it never does.
   *
   * `requestGameState` returns without sending on a socket that is not open, which
   * is exactly the state a socket is in for a moment after a reconnect — so the one
   * request a rejoining client used to make could vanish with no trace at either end.
   */
  const awaitFirstState = useCallback(() => {
    settleFirstState();
    firstStateRetry.current = window.setInterval(() => {
      gameWebSocketService.requestGameState();
    }, STATE_RETRY_MS);
    firstStateTimer.current = window.setTimeout(() => {
      setGameState((current) => {
        if (!current) {
          settleFirstState();
          setFatalError('The game server did not send the board. Please try again.');
        }
        return current;
      });
    }, STATE_DEADLINE_MS);
  }, [settleFirstState]);

  useEffect(() => settleFirstState, [settleFirstState]);

  const settlePendingMove = useCallback(() => {
    if (pendingMove.current) {
      window.clearTimeout(pendingMove.current.timer);
      pendingMove.current = null;
    }
  }, []);

  const revertPendingMove = useCallback(
    (reason: string) => {
      const pending = pendingMove.current;
      if (!pending) return;
      window.clearTimeout(pending.timer);
      pendingMove.current = null;
      setGameState(pending.revertTo);
      setCardOwnership(pending.ownershipBefore);
      setIsMyTurn(pending.revertTo.currentPlayerId === playerId);
      setError(reason);
    },
    [playerId],
  );

  /** The server's word, normalised and taken as the authority. */
  const acceptServerState = useCallback(
    (incoming: any) => {
      if (!incoming?.id || !incoming?.state) return;

      const state: GameState = {
        id: incoming.id,
        state: incoming.state,
        board: {
          width: incoming.board?.width || BOARD_WIDTH,
          height: incoming.board?.height || BOARD_HEIGHT,
          pieces: incoming.board?.pieces || {},
        },
        currentPlayerId: incoming.currentPlayerId,
        currentPlayerHand: incoming.currentPlayerHand || [],
        placedCards: incoming.placedCards || {},
        scores: incoming.scores || {},
        winnerId: incoming.winnerId,
        isTie: incoming.isTie,
        hasPendingWinRequest: incoming.hasPendingWinRequest,
        pendingWinRequestPlayerId: incoming.pendingWinRequestPlayerId,
        cardOwnership: incoming.cardOwnership || {},
        playerIds: incoming.playerIds || [],
        columnScores: incoming.columnScores || {},
        playerNames: incoming.playerNames || {},
      };

      settlePendingMove();
      settleFirstState();

      art.current = learnArt(art.current, [
        ...state.currentPlayerHand,
        ...Object.values(state.placedCards ?? {}),
      ]);

      const lines = describeNewMoves(previousPieces.current, state, playerId ?? '');
      previousPieces.current = state.board.pieces;
      if (lines.length) setBattleLog((log) => [...lines, ...log].slice(0, LOG_LENGTH));

      setGameState(state);
      setIsMyTurn(state.currentPlayerId === playerId);
      setCardOwnership(state.cardOwnership ?? {});

      if (state.playerNames && Object.keys(state.playerNames).length > 0) {
        setPlayers(state.playerNames);
      } else if (state.playerIds?.length) {
        setPlayers(Object.fromEntries(state.playerIds.map((id, i) => [id, `Player ${i + 1}`])));
      }
    },
    [playerId, settleFirstState, settlePendingMove],
  );

  // Open the socket, once, and keep the connection status in view.
  useEffect(() => {
    if (!playerId) return;

    gameWebSocketService
      .ensureConnected({
        onConnectionSuccess: () => {
          setConnectionStatus('connected');
          setIsConnected(true);
        },
        onGameStateUpdate: acceptServerState,
        onPlayerJoined: (joined) => {
          setMatchInfo((prev) => {
            if (prev && !prev.player2Id && joined !== prev.player1Id) {
              setIsInLobby(false);
              window.setTimeout(() => gameWebSocketService.requestGameState(), 500);
              return { ...prev, player2Id: joined, status: 'IN_PROGRESS' };
            }
            return prev;
          });
        },
        onPlayerDisconnected: () => setOpponentConnected(false),
        onPlayerReconnected: () => setOpponentConnected(true),
        onError: (message) => {
          // With a move in flight this is the server refusing it — take it back off
          // the board rather than leaving a position that does not exist.
          if (pendingMove.current) revertPendingMove(message);
          else setError(message);
        },
        onConnectionClosed: () => {
          setConnectionStatus('disconnected');
          setIsConnected(false);
        },
      })
      .catch((err) => {
        console.error('Failed to connect WebSocket:', err);
        setFatalError('Could not reach the game server. Please try again in a moment.');
      });

    if (gameWebSocketService.isConnected()) {
      setIsConnected(true);
      setConnectionStatus('connected');
    }
  }, [playerId, acceptServerState, revertPendingMove]);

  /*
   * Creating or joining runs once per mount, guarded by a ref rather than state:
   * creating a match is not idempotent — the server clears every waiting room you
   * already own first — so a second run deletes the room whose code is on screen.
   */
  const initStarted = useRef(false);

  useEffect(() => {
    if (!playerId || !isConnected || initStarted.current) return;
    initStarted.current = true;

    const join = async () => {
      setIsLoading(true);
      setError(null);
      try {
        for (let i = 0; i < 10 && !gameWebSocketService.isConnected(); i += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 200));
        }
        if (!gameWebSocketService.isConnected()) {
          setFatalError('The connection to the game server dropped. Reload the page to try again.');
          return;
        }

        if (matchId) {
          const response = await onlineGameService.joinMatch(matchId, playerId);
          try {
            await gameWebSocketService.joinMatch(matchId, playerId);
          } catch (err) {
            console.error('Failed to join WebSocket room:', err);
            setFatalError('Could not enter the battle room. Please try again.');
            return;
          }

          setMatchInfo({
            matchId,
            player1Id: 'host', // replaced by the server's view a moment later
            player2Id: playerId,
            status: 'IN_PROGRESS',
            createdAt: new Date().toISOString(),
          });

          if (response.status === 'IN_PROGRESS') {
            // Nothing is drawn until the server describes the game. Seeding an empty
            // board here is not a loading state but a false one.
            setIsInLobby(false);
            awaitFirstState();
            gameWebSocketService.requestGameState();
          }
          return;
        }

        const created = await onlineGameService.createMatch(playerId);
        setMatchInfo({
          matchId: created.matchId,
          player1Id: playerId,
          status: 'WAITING',
          createdAt: new Date().toISOString(),
        });
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        try {
          await gameWebSocketService.joinMatch(created.matchId, playerId);
        } catch (err) {
          console.error('Failed to join WebSocket room:', err);
          setFatalError('Could not open the battle room. Please try again.');
        }
      } catch (err) {
        console.error(err);
        setFatalError(
          matchId
            ? humanizeJoinError(err instanceof Error ? err.message : null)
            : 'Could not create the battle. Please try again.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    join();
  }, [playerId, matchId, isConnected, awaitFirstState]);

  const boardCards = useMemo(
    () => (gameState ? cardsByPosition(gameState, art.current) : {}),
    [gameState],
  );

  const validMoves = useMemo<Position[]>(() => {
    if (!selectedCard || !gameState || !isMyTurn || !playerId) return [];
    return legalPlacements(gameState.board.pieces ?? {}, cardOwnership, playerId);
  }, [selectedCard, gameState, isMyTurn, playerId, cardOwnership]);

  /**
   * Places a card: on the board at once, and over the socket that is already open.
   *
   * The board is drawn from the move immediately; the server's broadcast replaces it
   * a moment later and is the authority. If the server refuses, or says nothing at
   * all, the position is put back. The turn is deliberately left alone — whether it
   * passes depends on whether the opponent has a legal move, which is the server's
   * to decide.
   */
  const placeCard = useCallback(
    (x: number, y: number) => {
      if (!selectedCard || !isMyTurn || !gameState || !playerId) return;
      if (pendingMove.current) return; // one move at a time until the server answers
      if (!validMoves.some((move) => move.x === x && move.y === y)) return;

      const card = selectedCard;
      const key = positionKey(x, y);
      const revertTo = gameState;
      const ownershipBefore = cardOwnership;

      setGameState({
        ...gameState,
        board: { ...gameState.board, pieces: { ...gameState.board.pieces, [key]: card.id } },
        placedCards: { ...gameState.placedCards, [card.id]: card },
        cardOwnership: { ...gameState.cardOwnership, [key]: playerId },
        currentPlayerHand: gameState.currentPlayerHand.filter((c) => c.id !== card.id),
      });
      setCardOwnership({ ...ownershipBefore, [key]: playerId });
      setSelectedCard(null);
      setError(null);

      pendingMove.current = {
        revertTo,
        ownershipBefore,
        timer: window.setTimeout(
          () => revertPendingMove('The server did not confirm your move. Please try again.'),
          MOVE_DEADLINE_MS,
        ),
      };

      gameWebSocketService.sendGameAction({
        type: 'PLACE_CARD',
        playerId,
        card,
        targetPosition: { x, y },
        timestamp: Date.now(),
      });
    },
    [selectedCard, isMyTurn, gameState, playerId, validMoves, cardOwnership, revertPendingMove],
  );

  /** The three turn actions that still go over REST; the server broadcasts the result. */
  const post = useCallback(
    async (path: string, body: Record<string, unknown>, whenItFails: string) => {
      if (!gameState) return;
      try {
        const response = await apiFetch(`/game/${gameState.id}/${path}`, {
          method: 'POST',
          body: JSON.stringify({ playerId, ...body }),
        });
        if (!response.ok) throw new Error(whenItFails);
      } catch (err) {
        console.error(err);
        setError(whenItFails);
      }
    },
    [gameState, playerId],
  );

  const pass = useCallback(() => {
    if (!isMyTurn) return;
    return post('pass', {}, 'Your turn could not be passed. Please try again.');
  }, [isMyTurn, post]);

  const requestEarlyEnd = useCallback(() => {
    if (!isMyTurn) return;
    return post('request-win', {}, 'The request could not be sent. Please try again.');
  }, [isMyTurn, post]);

  // The server does not require it to be your turn to answer.
  const answerEarlyEnd = useCallback(
    (accepted: boolean) =>
      post('respond-win-request', { accepted }, 'Your answer could not be sent. Please try again.'),
    [post],
  );

  const startFromLobby = useCallback(() => {
    setIsInLobby(false);
    awaitFirstState();
    gameWebSocketService.requestGameState();
  }, [awaitFirstState]);

  const leave = useCallback(() => {
    // The game keeps whatever state it is in; only this client steps away.
    gameWebSocketService.leaveMatch();
    gameWebSocketService.disconnect();
  }, []);

  return {
    gameState,
    matchInfo,
    players,
    boardCards,
    cardOwnership,
    validMoves,
    selectedCard,
    setSelectedCard,
    isInLobby,
    isMyTurn,
    opponentConnected,
    connectionStatus,
    battleLog,
    isLoading,
    error,
    fatalError,
    placeCard,
    pass,
    requestEarlyEnd,
    answerEarlyEnd,
    startFromLobby,
    leave,
  };
}
