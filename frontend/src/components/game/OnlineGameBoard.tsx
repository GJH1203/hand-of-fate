'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import GameLobby from './GameLobby';
import ColumnIndicator from './ColumnIndicator';
import { Card, Position, GameState } from '@/types/game';
import { OnlineMatchInfo } from '@/types/gameMode';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useRouter } from 'next/navigation';
import { gameService } from '@/services/gameService';
import { WifiOff, Wifi, Users, AlertCircle } from 'lucide-react';
import { onlineGameService } from '@/services/onlineGameService';
import { gameWebSocketService } from '@/services/gameWebSocketService';

const DEFAULT_BOARD_WIDTH = 3;
const DEFAULT_BOARD_HEIGHT = 5;

interface OnlineGameBoardProps {
  matchId?: string;
  onBack: () => void;
}

// Debug flag - only enable in development
const DEBUG = process.env.NODE_ENV === 'development';

export default function OnlineGameBoard({ matchId, onBack }: OnlineGameBoardProps) {
    const { isAuthenticated, user } = useUnifiedAuth();
    const router = useRouter();
    
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
    
    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

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
                        
                        setGameState(mappedState);
                        setIsMyTurn(state.currentPlayerId === user.playerId);
                        updateBoardCards(mappedState);
                        
                        // Log if game is completed
                        if (mappedState.state === 'COMPLETED' && DEBUG) {
                            console.log('Game completed! Board pieces:', mappedState.board.pieces);
                            console.log('Placed cards:', mappedState.placedCards);
                            console.log('Column scores:', mappedState.columnScores);
                        }
                        
                        // Use card ownership from backend
                        if (state.cardOwnership) {
                            setCardOwnership(state.cardOwnership);
                            if (DEBUG) {
                                console.log('Updated card ownership from backend:', state.cardOwnership);
                            }
                        }
                        
                        // Debug logging
                        if (DEBUG) {
                            console.log('Current player ID:', state.currentPlayerId);
                            console.log('My player ID:', user.playerId);
                            console.log('Is my turn:', state.currentPlayerId === user.playerId);
                            console.log('Current player hand:', state.currentPlayerHand);
                            console.log('Card ownership:', state.cardOwnership);
                            console.log('Column scores:', state.columnScores);
                            console.log('Player names:', state.playerNames);
                            console.log('Full game state:', state);
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
                        } else {
                            if (DEBUG) console.warn('No playerIds in game state - backend needs to be restarted');
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
                    onPlayerDisconnected: (playerId) => {
                        if (DEBUG) console.log('Player disconnected:', playerId);
                        setOpponentConnected(false);
                    },
                    onPlayerReconnected: (playerId) => {
                        if (DEBUG) console.log('Player reconnected:', playerId);
                        setOpponentConnected(true);
                    },
                    onError: (error) => {
                        setError(error);
                    },
                    onConnectionClosed: () => {
                        setConnectionStatus('disconnected');
                        setIsConnected(false);
                    }
                });
            } catch (err) {
                console.error('Failed to connect WebSocket:', err);
                setError('Failed to connect to game server');
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
                    setError('WebSocket connection failed. Please refresh the page.');
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
                        if (DEBUG) console.log('Player successfully joined WebSocket room');
                    } catch (err) {
                        console.error('Failed to join WebSocket room:', err);
                        setError('Failed to join match room');
                        setIsLoading(false);
                        setIsJoining(false);
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
                        if (DEBUG) console.log('Host successfully joined WebSocket room');
                    } catch (err) {
                        console.error('Failed to join WebSocket room:', err);
                        setError('Failed to join match room');
                    }
                }
                
                // Mark as initialized to prevent duplicate attempts
                setMatchInitialized(true);
            } catch (err) {
                setError('Failed to initialize match');
                console.error(err);
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

    // Calculate valid moves - must be adjacent to current player's own cards
    useEffect(() => {
        if (!selectedCard || !gameState || !isMyTurn || !user) {
            setValidMoves([]);
            return;
        }

        const moves: Position[] = [];
        const boardPieces = gameState.board.pieces || {};
        
        if (DEBUG) console.log('Calculating valid moves, card ownership:', cardOwnership);
        
        // Check if board is empty (first move)
        const boardIsEmpty = Object.keys(boardPieces).length === 0;
        
        if (boardIsEmpty) {
            // If board is empty, all positions are valid
            for (let y = 0; y < DEFAULT_BOARD_HEIGHT; y++) {
                for (let x = 0; x < DEFAULT_BOARD_WIDTH; x++) {
                    moves.push({ x, y });
                }
            }
        } else {
            // Find positions adjacent to current player's own cards
            Object.entries(boardPieces).forEach(([posKey, cardId]) => {
                const [x, y] = posKey.split(',').map(Number);
                
                // Check if this card belongs to the current player
                const cardOwner = cardOwnership[posKey];
                if (cardOwner !== user.playerId) {
                    if (DEBUG) console.log(`Skipping card at ${posKey} - owned by ${cardOwner}, not ${user.playerId}`);
                    return;
                }
                
                if (DEBUG) console.log(`Found own card at ${posKey}`);
                
                // Check orthogonal adjacent positions (no diagonals)
                const adjacentPositions = [
                    { x: x-1, y: y }, // left
                    { x: x+1, y: y }, // right
                    { x: x, y: y-1 }, // top
                    { x: x, y: y+1 }  // bottom
                ];
                
                adjacentPositions.forEach(pos => {
                    // Check if position is valid (within bounds and empty)
                    if (pos.x >= 0 && pos.x < DEFAULT_BOARD_WIDTH &&
                        pos.y >= 0 && pos.y < DEFAULT_BOARD_HEIGHT &&
                        !boardPieces[`${pos.x},${pos.y}`]) {
                        // Add to moves if not already included
                        if (!moves.some(m => m.x === pos.x && m.y === pos.y)) {
                            moves.push(pos);
                            if (DEBUG) console.log(`Added valid position: ${pos.x},${pos.y}`);
                        }
                    }
                });
            });
        }
        
        setValidMoves(moves);
    }, [selectedCard, gameState, isMyTurn, user, cardOwnership]);

    // Handle card placement
    const handleCellClick = async (x: number, y: number) => {
        if (!selectedCard || !isMyTurn || !gameState || !matchInfo) return;
        
        const isValid = validMoves.some(move => move.x === x && move.y === y);
        if (!isValid) return;

        try {
            // Send move through REST API (WebSocket will broadcast the update)
            const response = await gameService.makeMove(gameState.id, {
                type: 'PLACE_CARD' as const,
                playerId: user!.playerId,
                card: selectedCard,
                targetPosition: { x, y },
                timestamp: Date.now()
            });
            
            // Clear selection
            setSelectedCard(null);
            setValidMoves([]);
            
            // Don't update game state from REST response - wait for WebSocket update
            // The WebSocket will broadcast the proper player-specific view with column scores
            if (DEBUG) console.log('Move successful, waiting for WebSocket update');
            
            // Only update turn status immediately for better UX
            if (response) {
                setIsMyTurn(response.currentPlayerId === user!.playerId);
            }
        } catch (err) {
            setError('Failed to make move');
            console.error(err);
        }
    };

    // Handle pass action
    const handlePass = async () => {
        if (!isMyTurn || !gameState) return;
        
        try {
            // Send pass action through REST API
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/game/${gameState.id}/pass`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: user!.playerId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to pass');
            }
            
            // Backend will broadcast the update via WebSocket
            // No need to send duplicate WebSocket action
        } catch (err) {
            setError('Failed to pass turn');
            console.error(err);
        }
    };

    // Handle win request
    const handleWinRequest = async () => {
        if (!isMyTurn || !gameState) return;
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/game/${gameState.id}/request-win`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: user!.playerId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to request win');
            }
            
            // Backend will broadcast the update via WebSocket
        } catch (err) {
            setError('Failed to request win');
            console.error(err);
        }
    };

    // Handle win response
    const handleWinResponse = async (accept: boolean) => {
        if (!isMyTurn || !gameState) return;
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/game/${gameState.id}/respond-win-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: user!.playerId,
                    accepted: accept
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to respond to win request');
            }
            
            // Backend will broadcast the update via WebSocket
        } catch (err) {
            setError('Failed to respond to win request');
            console.error(err);
        }
    };

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
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                    <p className="text-gray-300">Loading game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 relative">
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="bg-black/40 backdrop-blur-sm rounded-lg shadow-xl p-4 mb-4 border border-purple-500/30">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                onClick={handleCancelMatch}
                                className="bg-purple-800/30 hover:bg-purple-700/40 border-purple-500/50 text-purple-200 hover:text-purple-100 transition-all duration-300"
                            >
                                ← Back to Menu
                            </Button>
                            <div className="flex items-center gap-2">
                                {connectionStatus === 'connected' ? (
                                    <Wifi className="w-5 h-5 text-green-400 drop-shadow-lg" />
                                ) : (
                                    <WifiOff className="w-5 h-5 text-red-400 drop-shadow-lg" />
                                )}
                                <span className="text-sm text-gray-300">
                                    {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Badge 
                                className={isMyTurn 
                                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/20" 
                                    : "bg-gray-800/50 text-gray-300 border-gray-600/50"}
                            >
                                {isMyTurn ? "⚔️ Your Turn" : `${players[gameState.currentPlayerId] || 'Opponent'}'s Turn`}
                            </Badge>
                            {gameState.hasPendingWinRequest && (
                                <Badge className="bg-red-900/50 text-red-300 border-red-500/50">
                                    ⚠️ Early End Requested
                                </Badge>
                            )}
                            {matchInfo && (
                                <Badge className="bg-purple-900/50 text-purple-300 border-purple-500/50">
                                    📍 Room: {matchInfo.matchId.slice(-6).toUpperCase()}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Game Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Main Game Board */}
                    <div className="lg:col-span-2">
                        <div className="relative bg-black/40 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-purple-500/30 overflow-hidden">
                            {/* Arena Background */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center opacity-30"
                                style={{
                                    backgroundImage: "url('/backgrounds/battle-arena.png')",
                                    filter: "blur(1px)"
                                }}
                            />
                            <div className="relative z-10 flex flex-col items-center">
                                <h2 className="text-2xl font-bold mb-4 text-center text-purple-300 drop-shadow-lg">Battle Arena</h2>
                            
                            {/* Game Completion Banner */}
                            {gameState.state === 'COMPLETED' && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg shadow-2xl text-white">
                                    <h3 className="text-xl font-bold text-center mb-2">Game Complete!</h3>
                                    <p className="text-center text-lg">
                                        {gameState.isTie ? (
                                            "It's a Tie!"
                                        ) : gameState.winnerId === user?.playerId ? (
                                            "🎉 You Won! 🎉"
                                        ) : (
                                            `${players[gameState.winnerId || ''] || 'Opponent'} Won`
                                        )}
                                    </p>
                                    <div className="mt-2 text-center text-sm">
                                        Final Score: {Object.entries(gameState.scores || {}).map(([pid, score]) => 
                                            `${players[pid] || 'Player'}: ${score} columns`
                                        ).join(' | ')}
                                    </div>
                                </div>
                            )}
                            
                            {/* Column Indicators */}
                            <div className="grid grid-cols-3 gap-2 mb-4 w-fit mx-auto">
                                {[0, 1, 2].map(colIndex => (
                                    <div key={`col-indicator-${colIndex}`} className="w-28">
                                        <ColumnIndicator
                                            columnIndex={colIndex}
                                            columnScore={gameState.columnScores?.[colIndex]}
                                            players={players}
                                            currentPlayerId={user?.playerId || ''}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            {/* Board Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-6 w-fit mx-auto">
                                {Array.from({ length: DEFAULT_BOARD_HEIGHT }, (_, y) => 
                                    Array.from({ length: DEFAULT_BOARD_WIDTH }, (_, x) => {
                                        const posKey = `${x},${y}`;
                                        const card = boardCards[posKey];
                                        const isValidMove = validMoves.some(
                                            move => move.x === x && move.y === y
                                        );
                                        
                                        return (
                                            <GameCell
                                                key={posKey}
                                                position={{ x, y }}
                                                card={card}
                                                isValidMove={isValidMove && isMyTurn}
                                                onCellClick={() => handleCellClick(x, y)}
                                                selectedCard={selectedCard}
                                                cardOwner={card ? cardOwnership[posKey] : null}
                                                currentPlayerId={user?.playerId}
                                                playerNames={players}
                                            />
                                        );
                                    })
                                ).flat()}
                            </div>

                            {/* Your Hand (only visible when game is in progress) */}
                            {gameState.state === 'IN_PROGRESS' && (
                            <div className="relative bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-sm rounded-xl p-4 mt-4 overflow-hidden border border-purple-500/30">
                                {/* Mystical energy background effect */}
                                <div className="absolute inset-0">
                                    <div className="absolute inset-0 bg-gradient-to-t from-purple-600/10 via-transparent to-blue-600/10 animate-pulse" />
                                    <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                                    <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                                </div>
                                
                                {/* Title */}
                                <h3 className="text-center text-sm font-bold text-purple-300 mb-3 relative z-10">
                                    Your Mystical Hand
                                </h3>
                                
                                <div className="relative z-10">
                                    <PlayerHand
                                        cards={gameState.currentPlayerHand}
                                        isCurrentTurn={isMyTurn}
                                        selectedCard={selectedCard}
                                        onCardSelect={setSelectedCard}
                                    />
                                </div>
                            </div>
                            )}

                            {/* Action Buttons */}
                            {gameState.state === 'IN_PROGRESS' && (
                            <div className="flex gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={handlePass}
                                    disabled={!isMyTurn}
                                    className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group bg-gradient-to-br from-purple-800/80 via-purple-700/80 to-purple-900/80 hover:from-purple-700/90 hover:via-purple-600/90 hover:to-purple-800/90 text-purple-100 border border-purple-500/50 shadow-lg shadow-purple-900/50"
                                >
                                    <span className="relative z-10">Pass Turn</span>
                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </button>
                                
                                {isMyTurn && !gameState.hasPendingWinRequest && (
                                    <button
                                        type="button"
                                        onClick={handleWinRequest}
                                        disabled={!isMyTurn}
                                        className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group bg-gradient-to-br from-amber-700/80 via-amber-600/80 to-orange-700/80 hover:from-amber-600/90 hover:via-amber-500/90 hover:to-orange-600/90 text-amber-100 border border-amber-500/50 shadow-lg shadow-amber-900/50"
                                    >
                                        <span className="relative z-10">Request Early End</span>
                                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </button>
                                )}
                                
                                {gameState.hasPendingWinRequest && 
                                 gameState.pendingWinRequestPlayerId !== user!.playerId && 
                                 isMyTurn && (
                                    <div className="space-y-2">
                                        <Alert className="bg-yellow-900/30 border-yellow-500/50">
                                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                                            <AlertDescription className="text-yellow-200">
                                                Your opponent has requested to end the game early. 
                                                Do you accept?
                                            </AlertDescription>
                                        </Alert>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleWinResponse(true)}
                                                className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 relative overflow-hidden group bg-gradient-to-br from-emerald-700/80 via-emerald-600/80 to-green-700/80 hover:from-emerald-600/90 hover:via-emerald-500/90 hover:to-green-600/90 text-emerald-100 border border-emerald-500/50 shadow-lg shadow-emerald-900/50"
                                            >
                                                <span className="relative z-10">Accept & Calculate Winner</span>
                                                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleWinResponse(false)}
                                                className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 relative overflow-hidden group bg-gradient-to-br from-gray-700/80 via-gray-600/80 to-gray-800/80 hover:from-gray-600/90 hover:via-gray-500/90 hover:to-gray-700/90 text-gray-100 border border-gray-500/50 shadow-lg shadow-gray-900/50"
                                            >
                                                <span className="relative z-10">Continue Playing</span>
                                                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-gray-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}
                            </div>
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-4">
                        {/* Players Info */}
                        <div className="bg-black/40 backdrop-blur-sm rounded-2xl shadow-xl p-4 border border-purple-500/30">
                            <h3 className="font-bold mb-3 flex items-center gap-2 text-yellow-400">
                                <Users className="w-5 h-5" />
                                Players
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(players).map(([playerId, playerName]) => (
                                    <div key={playerId} className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-gray-200">
                                            {playerName} {playerId === user!.playerId && <span className="text-purple-400">(You)</span>}
                                            {playerId !== user!.playerId && !opponentConnected && (
                                                <Badge className="text-xs bg-red-900/50 text-red-300 border-red-500/50">
                                                    Disconnected
                                                </Badge>
                                            )}
                                        </span>
                                        <Badge className="bg-blue-900/50 text-blue-300 border-blue-500/50">
                                            {gameState.scores?.[playerId] || 0} column{(gameState.scores?.[playerId] || 0) !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Game Status */}
                        <div className="bg-black/40 backdrop-blur-sm rounded-2xl shadow-xl p-4 border border-purple-500/30">
                            <h3 className="font-bold mb-3 text-yellow-400">Game Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">State:</span>
                                    <Badge className="bg-purple-900/50 text-purple-300 border-purple-500/50">
                                        {gameState.state}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Cards in hand:</span>
                                    <span className="text-purple-200 font-bold">{gameState.currentPlayerHand.length}</span>
                                </div>
                                {gameState.state === 'COMPLETED' && (
                                    <div className="mt-4 p-3 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-700/50">
                                        <p className="font-bold text-center text-yellow-300">
                                            {gameState.isTie ? (
                                                "⚔️ Game ended in a tie! ⚔️"
                                            ) : gameState.winnerId === user!.playerId ? (
                                                "🎉 You won! 🎉"
                                            ) : (
                                                "💔 You lost. Better luck next time!"
                                            )}
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            className="w-full mt-2 bg-purple-800/30 hover:bg-purple-700/40 border-purple-500/50 text-purple-200 hover:text-purple-100 transition-all duration-300"
                                            onClick={handleCancelMatch}
                                        >
                                            Back to Menu
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}