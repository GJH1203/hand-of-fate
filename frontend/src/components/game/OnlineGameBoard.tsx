'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, ScrollText, Swords, Users, Wifi, WifiOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Modal } from '@/components/ui/modal';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import GameLobby from './GameLobby';
import ColumnIndicator from './ColumnIndicator';
import GameResultModal from './GameResultModal';
import { Card, Position, GameState } from '@/types/game';
import { OnlineMatchInfo } from '@/types/gameMode';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { onlineGameService } from '@/services/onlineGameService';
import { gameWebSocketService } from '@/services/gameWebSocketService';
import { apiFetch } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const DEFAULT_BOARD_WIDTH = 3;
const DEFAULT_BOARD_HEIGHT = 5;

/** How many moves the battle log keeps. */
const LOG_LENGTH = 6;

interface OnlineGameBoardProps {
  matchId?: string;
  onBack: () => void;
}

// Debug flag - only enable in development
const DEBUG = process.env.NODE_ENV === 'development';

/** IN_PROGRESS is a database value. This is what a person should read. */
function readableState(state: GameState['state']): { label: string; tone: 'info' | 'neutral' | 'success' } {
  switch (state) {
    case 'IN_PROGRESS':
      return { label: 'In Progress', tone: 'info' };
    case 'COMPLETED':
      return { label: 'Finished', tone: 'success' };
    default:
      return { label: 'Waiting', tone: 'neutral' };
  }
}

export default function OnlineGameBoard({ matchId, onBack }: OnlineGameBoardProps) {
    const { isAuthenticated, user } = useUnifiedAuth();
    const router = useRouter();
    const toast = useToast();

    // Game state
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [matchInfo, setMatchInfo] = useState<OnlineMatchInfo | null>(null);
    const [isInLobby, setIsInLobby] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    // UI state
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);
    const [boardCards, setBoardCards] = useState<Record<string, Card>>({});
    const [cardOwnership, setCardOwnership] = useState<Record<string, string>>({});
    const [players, setPlayers] = useState<{[key: string]: string}>({});
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [opponentConnected, setOpponentConnected] = useState(true);
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [resultDismissed, setResultDismissed] = useState(false);

    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** A failure that ends the screen — a bad code, a match that would not open. */
    const [fatalError, setFatalError] = useState<string | null>(null);

    // A move the player has made that the server has not confirmed yet. The board shows
    // it immediately — waiting for the round trip is a third of a second of a card not
    // appearing where it was dropped — so this holds what to put back if the server
    // refuses it, or never answers.
    const pendingMove = useRef<{ revertTo: GameState; ownershipBefore: Record<string, string>; timer: number } | null>(null);

    // updateBoardCards is declared further down; the revert path needs it from up here.
    const updateBoardCardsRef = useRef<((state: GameState) => void) | null>(null);

    // The board as the server last described it, so a new state can be diffed into a log.
    const previousPieces = useRef<Record<string, string> | null>(null);

    const settlePendingMove = useCallback(() => {
        if (pendingMove.current) {
            window.clearTimeout(pendingMove.current.timer);
            pendingMove.current = null;
        }
    }, []);

    const revertPendingMove = useCallback((reason: string) => {
        const pending = pendingMove.current;
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingMove.current = null;
        setGameState(pending.revertTo);
        setCardOwnership(pending.ownershipBefore);
        updateBoardCardsRef.current?.(pending.revertTo);
        setIsMyTurn(pending.revertTo.currentPlayerId === user?.playerId);
        setError(reason);
    }, [user?.playerId]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    // The tab says what you are looking at.
    useEffect(() => {
        const previous = document.title;
        document.title = 'Battle | Hand of Fate';
        return () => {
            document.title = previous;
        };
    }, []);

    // Initialize WebSocket connection
    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const setupWebSocket = async () => {
            try {
                // Check if component is still mounted
                if (!isMounted) {
                    if (DEBUG) console.log('Component unmounted, skipping WebSocket setup');
                    return;
                }

                // If already connected, just update state
                if (gameWebSocketService.isConnected()) {
                    if (DEBUG) console.log('WebSocket already connected');
                    setIsConnected(true);
                    setConnectionStatus('connected');
                    return;
                }

                if (DEBUG) console.log('Ensuring WebSocket connection...');
                await gameWebSocketService.ensureConnected({
                    onConnectionSuccess: () => {
                        if (DEBUG) console.log('WebSocket connection established successfully');
                        setConnectionStatus('connected');
                        setIsConnected(true);
                    },
                    onJoinSuccess: (data) => {
                        if (DEBUG) console.log('Joined match successfully:', data);
                    },
                    onGameStateUpdate: (state) => {
                        if (DEBUG) console.log('Game state update:', state);

                        // Skip if no game state yet
                        if (!state.id || !state.state) {
                            if (DEBUG) console.log('No game state available yet');
                            return;
                        }

                        // Map backend game state to frontend format
                        const mappedState: GameState = {
                            id: state.id,
                            state: state.state,
                            board: {
                                width: state.board?.width || 3,
                                height: state.board?.height || 5,
                                pieces: state.board?.pieces || {}
                            },
                            currentPlayerId: state.currentPlayerId,
                            currentPlayerHand: state.currentPlayerHand || [],
                            placedCards: state.placedCards || {},
                            scores: state.scores || {},
                            winnerId: state.winnerId,
                            isTie: state.isTie,
                            hasPendingWinRequest: state.hasPendingWinRequest,
                            pendingWinRequestPlayerId: state.pendingWinRequestPlayerId,
                            cardOwnership: state.cardOwnership || {},
                            playerIds: state.playerIds || [],
                            columnScores: state.columnScores || {},
                            playerNames: state.playerNames || {}
                        };

                        // The server's word replaces whatever was drawn optimistically.
                        settlePendingMove();

                        recordMoves(mappedState);
                        setGameState(mappedState);
                        setIsMyTurn(state.currentPlayerId === user.playerId);
                        updateBoardCards(mappedState);

                        // Use card ownership from backend
                        if (state.cardOwnership) {
                            setCardOwnership(state.cardOwnership);
                        }

                        // Update player names from backend
                        if (state.playerNames && Object.keys(state.playerNames).length > 0) {
                            setPlayers(state.playerNames);
                        } else if (state.playerIds && state.playerIds.length > 0) {
                            // Fallback to generic names if playerNames not available
                            const playerMap: {[key: string]: string} = {};
                            state.playerIds.forEach((id: string, index: number) => {
                                playerMap[id] = `Player ${index + 1}`;
                            });
                            setPlayers(playerMap);
                        } else if (DEBUG) {
                            console.warn('No playerIds in game state - backend needs to be restarted');
                        }
                    },
                    onPlayerJoined: (playerId) => {
                        if (DEBUG) console.log('Player joined:', playerId);
                        setMatchInfo(prev => {
                            if (prev && !prev.player2Id && playerId !== prev.player1Id) {
                                // Second player joined - game should start automatically
                                setIsInLobby(false);
                                // Request game state after a short delay
                                setTimeout(() => {
                                    gameWebSocketService.requestGameState();
                                }, 500);
                                return { ...prev, player2Id: playerId, status: 'IN_PROGRESS' };
                            }
                            return prev;
                        });
                    },
                    onPlayerDisconnected: () => setOpponentConnected(false),
                    onPlayerReconnected: () => setOpponentConnected(true),
                    onError: (error) => {
                        // If a move is waiting on the server, this is the server refusing
                        // it — take it back off the board rather than leaving the player
                        // looking at a position that does not exist.
                        if (pendingMove.current) {
                            revertPendingMove(error);
                        } else {
                            setError(error);
                        }
                    },
                    onConnectionClosed: () => {
                        setConnectionStatus('disconnected');
                        setIsConnected(false);
                    }
                });
            } catch (err) {
                console.error('Failed to connect WebSocket:', err);
                setFatalError('Could not reach the game server. Please try again in a moment.');
            }
        };

        setupWebSocket();

        return () => {
            isMounted = false;
            // Don't disconnect immediately - let the service handle reconnection
            // Only disconnect if we're truly leaving the game (not just navigating)
        };
    }, [user]);


    // Track if match has been initialized
    const [matchInitialized, setMatchInitialized] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // Initialize or join match
    useEffect(() => {
        if (!user || !isConnected || matchInitialized || isJoining) return;

        const initializeMatch = async () => {
            try {
                setIsJoining(true);
                setIsLoading(true);
                setError(null);

                // Ensure WebSocket is connected before proceeding
                let connectionAttempts = 0;
                while (!gameWebSocketService.isConnected() && connectionAttempts < 10) {
                    if (DEBUG) console.log(`WebSocket not connected, waiting... (attempt ${connectionAttempts + 1})`);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    connectionAttempts++;
                }

                if (!gameWebSocketService.isConnected()) {
                    setFatalError('The connection to the game server dropped. Reload the page to try again.');
                    setIsLoading(false);
                    setIsJoining(false);
                    return;
                }

                if (matchId) {
                    // Join existing match
                    const joinResponse = await onlineGameService.joinMatch(matchId, user.playerId);

                    // Join WebSocket room
                    if (DEBUG) console.log('Player joining WebSocket room:', matchId);
                    try {
                        await gameWebSocketService.joinMatch(matchId, user.playerId);
                    } catch (err) {
                        console.error('Failed to join WebSocket room:', err);
                        setFatalError('Could not enter the battle room. Please try again.');
                        setIsLoading(false);
                        setIsJoining(false);
                        return;
                    }

                    const mockMatch: OnlineMatchInfo = {
                        matchId: matchId,
                        player1Id: 'host', // Will be updated from server
                        player2Id: user.playerId,
                        status: 'IN_PROGRESS',
                        createdAt: new Date().toISOString()
                    };
                    setMatchInfo(mockMatch);

                    if (joinResponse.status === 'IN_PROGRESS') {
                        // Game already started, skip lobby
                        setIsInLobby(false);

                        // Store the game ID from join response
                        if (joinResponse.gameId) {
                            setGameState({
                                id: joinResponse.gameId,
                                state: 'IN_PROGRESS',
                                board: { width: 3, height: 5, pieces: {} },
                                currentPlayerId: '',
                                currentPlayerHand: [],
                                placedCards: {},
                                scores: {},
                                winnerId: null,
                                isTie: false,
                                hasPendingWinRequest: false,
                                pendingWinRequestPlayerId: null
                            });
                        }

                        // Request current game state
                        setTimeout(() => {
                            gameWebSocketService.requestGameState();
                        }, 100);
                    }
                } else {
                    // Create new match
                    const createResponse = await onlineGameService.createMatch(user.playerId);

                    // Store match info first
                    const mockMatch: OnlineMatchInfo = {
                        matchId: createResponse.matchId,
                        player1Id: user.playerId,
                        status: 'WAITING',
                        createdAt: new Date().toISOString()
                    };
                    setMatchInfo(mockMatch);

                    // Small delay to ensure WebSocket is ready
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Join WebSocket room
                    if (DEBUG) console.log('Host joining WebSocket room:', createResponse.matchId);
                    try {
                        await gameWebSocketService.joinMatch(createResponse.matchId, user.playerId);
                    } catch (err) {
                        console.error('Failed to join WebSocket room:', err);
                        setFatalError('Could not open the battle room. Please try again.');
                    }
                }

                // Mark as initialized to prevent duplicate attempts
                setMatchInitialized(true);
            } catch (err) {
                console.error(err);
                setFatalError(
                    matchId
                        ? 'No battle found with this code.'
                        : 'Could not create the battle. Please try again.',
                );
            } finally {
                setIsLoading(false);
                setIsJoining(false);
            }
        };

        initializeMatch();
    }, [user, matchId, isConnected, matchInitialized, isJoining]);

    // Handle lobby events
    const handleGameStart = useCallback(() => {
        setIsInLobby(false);
        // Game state will come from WebSocket
        gameWebSocketService.requestGameState();
    }, []);

    const handleCancelMatch = useCallback(async () => {
        if (matchInfo && user) {
            gameWebSocketService.leaveMatch();
            // Disconnect WebSocket when user explicitly goes back to menu
            gameWebSocketService.disconnect();
            // Don't call leaveAllMatches here - we don't want to abandon the game
            // The game should remain in its current state (IN_PROGRESS or COMPLETED)
        }
        onBack();
    }, [onBack, matchInfo, user]);

    /**
     * Turns the difference between two server states into readable lines.
     *
     * There is no event stream on the server, so this is the only history there is —
     * and it is real: every line is a piece that appeared on the board while this
     * client was watching, not a guess about what might have happened.
     */
    const recordMoves = (state: GameState) => {
        const before = previousPieces.current;
        const after = state.board?.pieces ?? {};
        previousPieces.current = after;
        if (!before) return;

        const entries = Object.entries(after)
            .filter(([positionKey]) => !(positionKey in before))
            .map(([positionKey, cardId]) => {
                const [x] = positionKey.split(',').map(Number);
                const card = state.placedCards?.[cardId];
                const ownerId = state.cardOwnership?.[positionKey];
                const owner = ownerId === user?.playerId ? 'You' : (ownerId && state.playerNames?.[ownerId]) || 'Opponent';
                const name = card?.name ?? 'a card';
                const power = card ? ` (${card.power})` : '';
                return `${owner} placed ${name}${power} → Col ${x + 1}`;
            });

        if (entries.length) {
            setBattleLog((log) => [...entries.reverse(), ...log].slice(0, LOG_LENGTH));
        }
    };

    // Update board cards display
    const updateBoardCards = (state: GameState) => {
        const cardMap: Record<string, Card> = {};

        if (state.board?.pieces) {
            Object.entries(state.board.pieces).forEach(([posKey, cardId]) => {
                // For now, create a placeholder card if we don't have the full card data
                // The backend should include card details in placedCards
                const card = state.placedCards?.[cardId] || {
                    id: cardId,
                    power: 1,
                    name: 'Card'
                };
                cardMap[posKey] = card;
            });
        }

        setBoardCards(cardMap);
    };
    updateBoardCardsRef.current = updateBoardCards;

    // Calculate valid moves - must be adjacent to current player's own cards
    useEffect(() => {
        if (!selectedCard || !gameState || !isMyTurn || !user) {
            setValidMoves([]);
            return;
        }

        const moves: Position[] = [];
        const boardPieces = gameState.board.pieces || {};

        // Check if board is empty (first move)
        if (Object.keys(boardPieces).length === 0) {
            for (let y = 0; y < DEFAULT_BOARD_HEIGHT; y++) {
                for (let x = 0; x < DEFAULT_BOARD_WIDTH; x++) {
                    moves.push({ x, y });
                }
            }
        } else {
            // Find positions adjacent to current player's own cards
            Object.entries(boardPieces).forEach(([posKey]) => {
                const [x, y] = posKey.split(',').map(Number);

                if (cardOwnership[posKey] !== user.playerId) return;

                // Check orthogonal adjacent positions (no diagonals)
                const adjacentPositions = [
                    { x: x - 1, y },
                    { x: x + 1, y },
                    { x, y: y - 1 },
                    { x, y: y + 1 },
                ];

                adjacentPositions.forEach(pos => {
                    if (pos.x >= 0 && pos.x < DEFAULT_BOARD_WIDTH &&
                        pos.y >= 0 && pos.y < DEFAULT_BOARD_HEIGHT &&
                        !boardPieces[`${pos.x},${pos.y}`] &&
                        !moves.some(m => m.x === pos.x && m.y === pos.y)) {
                        moves.push(pos);
                    }
                });
            });
        }

        setValidMoves(moves);
    }, [selectedCard, gameState, isMyTurn, user, cardOwnership]);

    /**
     * Places a card: on the board at once, and over the socket that is already open.
     *
     * <p>The move used to go out as its own HTTP request and the card did not appear
     * until the server's broadcast came back — a full round trip of a card not being
     * where it was dropped. It goes over the existing WebSocket now, and the board is
     * drawn from the move immediately; the server's broadcast replaces it a moment later
     * and is the authority. If the server refuses, or says nothing at all, the position
     * is put back.
     */
    const handleCellClick = (x: number, y: number) => {
        if (!selectedCard || !isMyTurn || !gameState || !matchInfo) return;
        if (pendingMove.current) return; // one move at a time until the server answers

        const isValid = validMoves.some(move => move.x === x && move.y === y);
        if (!isValid) return;

        const card = selectedCard;
        const positionKey = `${x},${y}`;
        const revertTo = gameState;
        const ownershipBefore = cardOwnership;

        const optimistic: GameState = {
            ...gameState,
            board: { ...gameState.board, pieces: { ...gameState.board.pieces, [positionKey]: card.id } },
            placedCards: { ...gameState.placedCards, [card.id]: card },
            cardOwnership: { ...gameState.cardOwnership, [positionKey]: user!.playerId },
            currentPlayerHand: gameState.currentPlayerHand.filter(c => c.id !== card.id),
        };

        setGameState(optimistic);
        setCardOwnership({ ...ownershipBefore, [positionKey]: user!.playerId });
        updateBoardCards(optimistic);
        setSelectedCard(null);
        setValidMoves([]);
        // The turn is left alone on purpose: whether it passes depends on whether the
        // opponent has a legal move, which is the server's to decide. Input is held by
        // pendingMove until it says.
        setError(null);

        pendingMove.current = {
            revertTo,
            ownershipBefore,
            // A socket that has gone quiet must not leave a card sitting on the board for
            // ever. Reconnection does not work yet, so this is the only thing that notices.
            timer: window.setTimeout(
                () => revertPendingMove('The server did not confirm your move. Please try again.'),
                5000,
            ),
        };

        gameWebSocketService.sendGameAction({
            type: 'PLACE_CARD',
            playerId: user!.playerId,
            card,
            targetPosition: { x, y },
            timestamp: Date.now(),
        });
    };

    // Handle pass action
    const handlePass = async () => {
        if (!isMyTurn || !gameState) return;

        try {
            const response = await apiFetch(`/game/${gameState.id}/pass`, {
                method: 'POST',
                body: JSON.stringify({ playerId: user!.playerId }),
            });
            if (!response.ok) throw new Error('Failed to pass');
            // Backend will broadcast the update via WebSocket
        } catch (err) {
            setError('Your turn could not be passed. Please try again.');
            console.error(err);
        }
    };

    // Handle win request
    const handleWinRequest = async () => {
        if (!isMyTurn || !gameState) return;

        try {
            const response = await apiFetch(`/game/${gameState.id}/request-win`, {
                method: 'POST',
                body: JSON.stringify({ playerId: user!.playerId }),
            });
            if (!response.ok) throw new Error('Failed to request win');
            toast('Early end requested — waiting for your opponent to agree.');
        } catch (err) {
            setError('The request could not be sent. Please try again.');
            console.error(err);
        }
    };

    // Handle win response. The server does not require it to be your turn.
    const handleWinResponse = async (accept: boolean) => {
        if (!gameState) return;

        try {
            const response = await apiFetch(`/game/${gameState.id}/respond-win-request`, {
                method: 'POST',
                body: JSON.stringify({ playerId: user!.playerId, accepted: accept }),
            });
            if (!response.ok) throw new Error('Failed to respond to win request');
        } catch (err) {
            setError('Your answer could not be sent. Please try again.');
            console.error(err);
        }
    };

    if (fatalError) {
        return (
            <main className="flex min-h-dvh items-center justify-center px-6">
                <Panel className="w-full max-w-md">
                    <PanelBody>
                        <InlineAlert tone="danger">{fatalError}</InlineAlert>
                        <Button variant="secondary" className="mt-5 w-full" onClick={onBack}>
                            <ArrowLeft size={16} strokeWidth={1.75} />
                            Back to Menu
                        </Button>
                    </PanelBody>
                </Panel>
            </main>
        );
    }

    // Render lobby if still waiting
    if (isInLobby && matchInfo) {
        return (
            <GameLobby
                matchInfo={matchInfo}
                currentPlayerId={user!.playerId}
                onGameStart={handleGameStart}
                onCancel={handleCancelMatch}
            />
        );
    }

    // Loading state
    if (isLoading || !gameState) {
        return (
            <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
                <Spinner size={28} className="text-arcane-300" />
                <p className="type-small text-ink-low">Opening the arena…</p>
            </main>
        );
    }

    const opponentId = Object.keys(players).find((id) => id !== user!.playerId);
    const isFinished = gameState.state === 'COMPLETED';
    const stateLabel = readableState(gameState.state);
    const roomCode = matchInfo ? matchInfo.matchId.slice(-6).toUpperCase() : null;

    const iRequestedEarlyEnd =
        !!gameState.hasPendingWinRequest && gameState.pendingWinRequestPlayerId === user!.playerId;
    const theyRequestedEarlyEnd =
        !!gameState.hasPendingWinRequest && gameState.pendingWinRequestPlayerId !== user!.playerId;

    const outcome = gameState.isTie
        ? ('tie' as const)
        : gameState.winnerId === user!.playerId
          ? ('win' as const)
          : ('loss' as const);

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
                            The arena needs a window at least 1024 pixels wide to show the board and
                            your hand at once. Your battle is safe — open this page on a larger
                            screen to continue it.
                        </p>
                        <Button variant="secondary" className="mt-5 w-full" onClick={onBack}>
                            <ArrowLeft size={16} strokeWidth={1.75} />
                            Back to Menu
                        </Button>
                    </PanelBody>
                </Panel>
            </main>

        <div className="hidden h-dvh grid-rows-[56px_1fr] overflow-hidden lg:grid">
            {/* Top bar */}
            <header className="flex items-center justify-between gap-4 border-b border-subtle bg-surface-1/70 px-4 backdrop-blur-md">
                <Button
                    variant="ghost"
                    size="md"
                    onClick={() => (isFinished ? handleCancelMatch() : setConfirmLeave(true))}
                >
                    <ArrowLeft size={16} strokeWidth={1.75} />
                    Back to Menu
                </Button>

                <div className="flex items-center gap-2 text-[13px] text-ink-mid">
                    {connectionStatus === 'connected' ? (
                        <>
                            <span className="h-2 w-2 rounded-full bg-success" />
                            <Wifi size={16} strokeWidth={1.75} className="text-success" />
                            Connected
                        </>
                    ) : (
                        <>
                            <span className="h-2 w-2 rounded-full bg-danger" />
                            <WifiOff size={16} strokeWidth={1.75} className="text-danger" />
                            Reconnecting…
                            <Spinner size={14} className="text-danger" />
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {gameState.hasPendingWinRequest && (
                        <Badge tone="warning">Early End Requested</Badge>
                    )}
                    <Badge tone={isMyTurn ? 'success' : 'danger'} dot>
                        {isMyTurn
                            ? 'Your Turn'
                            : `${(opponentId && players[opponentId]) || 'Opponent'}'s Turn`}
                    </Badge>
                    {roomCode && (
                        <Badge tone="gold" className="font-mono tracking-[0.12em]">
                            Room {roomCode}
                        </Badge>
                    )}
                </div>
            </header>

            <div className="grid min-h-0 grid-cols-[1fr_300px] gap-4 p-4">
                {/* Battlefield */}
                <div
                    /*
                     * The board has to fit in whatever is left after the bar, the column
                     * headers and the hand — so the cell size is derived from the viewport
                     * rather than guessed. Each part of that subtraction is a variable
                     * here, and the hand panel below is pinned to --hand, so the two
                     * cannot drift apart and start overlapping.
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
                    <div className="mx-auto grid grid-cols-3 gap-2"
                         style={{ width: 'calc(var(--cell) * 3 + 1rem)' }}>
                        {[0, 1, 2].map(colIndex => (
                            <ColumnIndicator
                                key={`col-${colIndex}`}
                                columnIndex={colIndex}
                                columnScore={gameState.columnScores?.[colIndex]}
                                players={players}
                                currentPlayerId={user?.playerId || ''}
                            />
                        ))}
                    </div>

                    <div className="flex min-h-0 items-center justify-center overflow-hidden">
                        <div className="grid grid-cols-3 gap-2"
                             style={{ width: 'calc(var(--cell) * 3 + 1rem)' }}>
                            {Array.from({ length: DEFAULT_BOARD_HEIGHT }, (_, y) =>
                                Array.from({ length: DEFAULT_BOARD_WIDTH }, (_, x) => {
                                    const posKey = `${x},${y}`;
                                    return (
                                        <GameCell
                                            key={posKey}
                                            position={{ x, y }}
                                            card={boardCards[posKey] ?? null}
                                            isValidMove={
                                                isMyTurn && validMoves.some(move => move.x === x && move.y === y)
                                            }
                                            onCellClick={() => handleCellClick(x, y)}
                                            selectedCard={selectedCard}
                                            cardOwner={boardCards[posKey] ? cardOwnership[posKey] : null}
                                            currentPlayerId={user?.playerId}
                                            playerNames={players}
                                        />
                                    );
                                }),
                            ).flat()}
                        </div>
                    </div>

                    {/* Hand — always on screen, never scrolled to */}
                    <div
                        className="flex flex-col rounded-lg border border-subtle bg-surface-1 px-4 py-3"
                        style={{ height: 'var(--hand)' }}
                    >
                        <div className="mb-2 flex items-center justify-between gap-4">
                            <span className="type-micro text-ink-low">Your Mystical Hand</span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="md"
                                    onClick={handlePass}
                                    disabled={!isMyTurn || isFinished}
                                >
                                    Pass Turn
                                </Button>
                                {iRequestedEarlyEnd ? (
                                    <Button variant="ghost" size="md" disabled>
                                        <Spinner size={16} />
                                        Awaiting opponent…
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="md"
                                        onClick={handleWinRequest}
                                        disabled={!isMyTurn || isFinished || theyRequestedEarlyEnd}
                                    >
                                        Request Early End
                                    </Button>
                                )}
                            </div>
                        </div>

                        <PlayerHand
                            className="min-h-0 flex-1"
                            cards={gameState.currentPlayerHand}
                            isCurrentTurn={isMyTurn && !isFinished}
                            selectedCard={selectedCard}
                            onCardSelect={setSelectedCard}
                        />
                    </div>
                </div>

                {/* Sidebar — the only thing on this screen allowed to scroll */}
                <aside className="min-h-0 space-y-4 overflow-y-auto pr-1">
                    {error && (
                        <InlineAlert tone="danger">{error}</InlineAlert>
                    )}

                    <Panel>
                        <PanelHeader icon={Users} title="Players" className="px-4 py-3" />
                        <PanelBody className="space-y-2 p-3">
                            {Object.entries(players).map(([playerId, playerName]) => {
                                const isMe = playerId === user!.playerId;
                                const isActive = gameState.currentPlayerId === playerId;
                                const columns = gameState.scores?.[playerId] ?? 0;
                                return (
                                    <div
                                        key={playerId}
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-md border border-subtle bg-surface-2 px-3 py-2',
                                            isActive && 'border-l-[3px] border-l-success',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-sm font-bold ring-2',
                                                isMe ? 'text-gold-300 ring-gold-400/60' : 'text-danger ring-danger/60',
                                            )}
                                        >
                                            {playerName.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                            <span className="truncate text-sm text-ink-hi">{playerName}</span>
                                            {isMe && <span className="type-micro text-ink-low">You</span>}
                                            {isActive && (
                                                <span
                                                    className="h-2 w-2 shrink-0 rounded-full bg-success"
                                                    style={{ animation: 'breathe 1.6s ease-in-out infinite' }}
                                                />
                                            )}
                                        </span>
                                        {!isMe && !opponentConnected ? (
                                            <Badge tone="danger">Offline</Badge>
                                        ) : (
                                            <Badge tone={isMe ? 'gold' : 'neutral'} className="tabular">
                                                {columns} col{columns === 1 ? '' : 's'}
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </PanelBody>
                    </Panel>

                    <Panel>
                        <PanelHeader icon={Activity} title="Game Status" className="px-4 py-3" />
                        <PanelBody className="space-y-2.5 p-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-ink-mid">State</span>
                                <Badge tone={stateLabel.tone}>{stateLabel.label}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-ink-mid">Cards in hand</span>
                                <span className="tabular text-ink-hi">
                                    {gameState.currentPlayerHand.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-ink-mid">Cards on board</span>
                                <span className="tabular text-ink-hi">
                                    {Object.keys(gameState.board.pieces ?? {}).length}
                                </span>
                            </div>
                        </PanelBody>
                    </Panel>

                    <Panel>
                        <PanelHeader icon={ScrollText} title="Battle Log" className="px-4 py-3" />
                        <PanelBody className="p-4">
                            {battleLog.length === 0 ? (
                                <p className="type-small text-ink-low">No moves yet.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {battleLog.map((entry, index) => (
                                        <li
                                            key={`${entry}-${index}`}
                                            className={cn(
                                                'type-small',
                                                index === 0 ? 'text-ink-mid' : 'text-ink-low',
                                            )}
                                        >
                                            {entry}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </PanelBody>
                    </Panel>
                </aside>
            </div>

            <Modal
                open={theyRequestedEarlyEnd && !isFinished}
                onClose={() => handleWinResponse(false)}
                title="End the duel now?"
                showCloseButton={false}
                closeOnOverlayClick={false}
                widthClassName="max-w-sm"
            >
                <p className="text-sm text-ink-mid">
                    Your opponent proposes to end early and count the columns as they stand.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => handleWinResponse(false)}>
                        Decline
                    </Button>
                    <Button variant="primary" onClick={() => handleWinResponse(true)}>
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
                    <Button variant="danger" onClick={handleCancelMatch}>
                        Leave
                    </Button>
                </div>
            </Modal>

            <GameResultModal
                open={isFinished && !resultDismissed}
                outcome={outcome}
                columnScores={gameState.columnScores ?? {}}
                players={players}
                currentPlayerId={user!.playerId}
                columnsWon={gameState.scores ?? {}}
                onReturn={() => {
                    setResultDismissed(true);
                    handleCancelMatch();
                }}
            />
        </div>
        </>
    );
}
