'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import GameLobby from './GameLobby';
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
                    console.log('Component unmounted, skipping WebSocket setup');
                    return;
                }
                
                // If already connected, just update state
                if (gameWebSocketService.isConnected()) {
                    console.log('WebSocket already connected');
                    setIsConnected(true);
                    setConnectionStatus('connected');
                    return;
                }
                
                console.log('Ensuring WebSocket connection...');
                await gameWebSocketService.ensureConnected({
                    onConnectionSuccess: () => {
                        console.log('WebSocket connection established successfully');
                        setConnectionStatus('connected');
                        setIsConnected(true);
                    },
                    onJoinSuccess: (data) => {
                        console.log('Joined match successfully:', data);
                    },
                    onGameStateUpdate: (state) => {
                        console.log('Game state update:', state);
                        
                        // Check if this is a waiting status update
                        if (state.status === 'WAITING') {
                            console.log('Still waiting for players...');
                            return;
                        }
                        
                        // Map backend game state to frontend format
                        const mappedState: GameState = {
                            id: state.id,
                            state: state.state || state.gameState,
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
                            playerIds: state.playerIds || []
                        };
                        
                        setGameState(mappedState);
                        setIsMyTurn(state.currentPlayerId === user.playerId);
                        updateBoardCards(mappedState);
                        
                        // Use card ownership from backend
                        if (state.cardOwnership) {
                            setCardOwnership(state.cardOwnership);
                            console.log('Updated card ownership from backend:', state.cardOwnership);
                        }
                        
                        // Debug logging
                        console.log('Current player ID:', state.currentPlayerId);
                        console.log('My player ID:', user.playerId);
                        console.log('Is my turn:', state.currentPlayerId === user.playerId);
                        console.log('Current player hand:', state.currentPlayerHand);
                        console.log('Card ownership:', state.cardOwnership);
                        
                        // Update player names if available
                        if (state.playerIds && state.playerIds.length > 0) {
                            const playerMap: {[key: string]: string} = {};
                            state.playerIds.forEach((id: string, index: number) => {
                                playerMap[id] = `Player ${index + 1}`;
                            });
                            setPlayers(playerMap);
                        } else {
                            console.warn('No playerIds in game state - backend needs to be restarted');
                        }
                    },
                    onPlayerJoined: (playerId) => {
                        console.log('Player joined:', playerId);
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
                        console.log('Player disconnected:', playerId);
                        setOpponentConnected(false);
                    },
                    onPlayerReconnected: (playerId) => {
                        console.log('Player reconnected:', playerId);
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
            // Small delay to prevent rapid reconnection in development
            setTimeout(() => {
                if (!isMounted) {
                    gameWebSocketService.disconnect();
                }
            }, 100);
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
                    console.log(`WebSocket not connected, waiting... (attempt ${connectionAttempts + 1})`);
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
                    // Leave any existing matches first
                    await onlineGameService.leaveAllMatches(user.playerId);
                    
                    // Small delay to ensure cleanup completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Join existing match
                    const joinResponse = await onlineGameService.joinMatch(matchId, user.playerId);
                    
                    // Join WebSocket room
                    console.log('Player joining WebSocket room:', matchId);
                    try {
                        await gameWebSocketService.joinMatch(matchId, user.playerId);
                        console.log('Player successfully joined WebSocket room');
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
                    // Leave any existing matches first
                    await onlineGameService.leaveAllMatches(user.playerId);
                    
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
                    console.log('Host joining WebSocket room:', createResponse.matchId);
                    try {
                        await gameWebSocketService.joinMatch(createResponse.matchId, user.playerId);
                        console.log('Host successfully joined WebSocket room');
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
            try {
                await onlineGameService.leaveAllMatches(user.playerId);
            } catch (err) {
                console.error('Error leaving matches:', err);
            }
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
        
        console.log('Calculating valid moves, card ownership:', cardOwnership);
        
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
                    console.log(`Skipping card at ${posKey} - owned by ${cardOwner}, not ${user.playerId}`);
                    return;
                }
                
                console.log(`Found own card at ${posKey}`);
                
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
                            console.log(`Added valid position: ${pos.x},${pos.y}`);
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
                playerId: user!.playerId,
                card: selectedCard,
                targetPosition: { x, y }
            });
            
            // Clear selection
            setSelectedCard(null);
            setValidMoves([]);
            
            // The response already contains the updated game state
            // Update our local state immediately
            if (response) {
                console.log('Move successful, updating local state');
                setIsMyTurn(response.currentPlayerId === user!.playerId);
                
                // Update card ownership from backend response
                if (response.cardOwnership) {
                    setCardOwnership(response.cardOwnership);
                    console.log('Updated card ownership from response:', response.cardOwnership);
                }
                
                // Update the board display with the new game state
                updateBoardCards(response);
                
                // Also update the full game state
                setGameState(response);
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
            const response = await fetch(`http://localhost:8080/game/${gameState.id}/pass`, {
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
            const response = await fetch(`http://localhost:8080/game/${gameState.id}/request-win`, {
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
            const response = await fetch(`http://localhost:8080/game/${gameState.id}/respond-win-request`, {
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
                            <Button variant="outline" onClick={handleCancelMatch}>
                                Back to Menu
                            </Button>
                            <div className="flex items-center gap-2">
                                {connectionStatus === 'connected' ? (
                                    <Wifi className="w-5 h-5 text-green-500" />
                                ) : (
                                    <WifiOff className="w-5 h-5 text-red-500" />
                                )}
                                <span className="text-sm">
                                    {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Badge variant={isMyTurn ? "default" : "secondary"}>
                                {isMyTurn ? "Your Turn" : `${players[gameState.currentPlayerId] || 'Opponent'}'s Turn`}
                            </Badge>
                            {gameState.hasPendingWinRequest && (
                                <Badge variant="destructive">
                                    Early End Requested
                                </Badge>
                            )}
                            {matchInfo && (
                                <Badge variant="outline">
                                    Room: {matchInfo.matchId.slice(-6).toUpperCase()}
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

                            {/* Your Hand (only visible when it's your turn) */}
                            <div className="relative bg-black/40 rounded-xl p-4 mt-4 overflow-hidden">
                                {/* Wooden Background */}
                                <div 
                                    className="absolute inset-0 bg-cover bg-center opacity-70"
                                    style={{
                                        backgroundImage: "url('/backgrounds/wooden-table.png')",
                                        filter: "brightness(0.7) contrast(1.1)"
                                    }}
                                />
                                <div className="relative z-10">
                                    <PlayerHand
                                        cards={gameState.currentPlayerHand}
                                        isCurrentTurn={isMyTurn}
                                        selectedCard={selectedCard}
                                        onCardSelect={setSelectedCard}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant="secondary"
                                    onClick={handlePass}
                                    disabled={!isMyTurn}
                                >
                                    Pass Turn
                                </Button>
                                
                                {isMyTurn && !gameState.hasPendingWinRequest && (
                                    <Button
                                        variant="default"
                                        onClick={handleWinRequest}
                                        disabled={!isMyTurn}
                                        className="relative z-20"
                                    >
                                        Request Early End
                                    </Button>
                                )}
                                
                                {gameState.hasPendingWinRequest && 
                                 gameState.pendingWinRequestPlayerId !== user!.playerId && 
                                 isMyTurn && (
                                    <div className="space-y-2">
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Your opponent has requested to end the game early. 
                                                Do you accept?
                                            </AlertDescription>
                                        </Alert>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="default"
                                                onClick={() => handleWinResponse(true)}
                                            >
                                                Accept & Calculate Winner
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleWinResponse(false)}
                                            >
                                                Continue Playing
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                        <span className="flex items-center gap-2">
                                            {playerName} {playerId === user!.playerId && '(You)'}
                                            {playerId !== user!.playerId && !opponentConnected && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Disconnected
                                                </Badge>
                                            )}
                                        </span>
                                        <Badge>{gameState.scores?.[playerId] || 0}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Game Status */}
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <h3 className="font-bold mb-3">Game Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>State:</span>
                                    <Badge variant="outline">{gameState.state}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Cards in hand:</span>
                                    <span>{gameState.currentPlayerHand.length}</span>
                                </div>
                                {gameState.state === 'COMPLETED' && (
                                    <div className="mt-4 p-3 bg-yellow-100 rounded">
                                        <p className="font-bold text-center">
                                            {gameState.isTie ? (
                                                "Game ended in a tie!"
                                            ) : gameState.winnerId === user!.playerId ? (
                                                "You won! 🎉"
                                            ) : (
                                                "You lost. Better luck next time!"
                                            )}
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            className="w-full mt-2"
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