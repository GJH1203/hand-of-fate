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
                // Only connect if component is still mounted and not already connected
                if (!isMounted || gameWebSocketService.isConnected()) return;
                
                await gameWebSocketService.connect({
                    onConnectionSuccess: () => {
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
                            pendingWinRequestPlayerId: state.pendingWinRequestPlayerId
                        };
                        
                        setGameState(mappedState);
                        setIsMyTurn(state.currentPlayerId === user.playerId);
                        updateBoardCards(mappedState);
                        
                        // Update player names if available
                        if (state.playerIds && state.playerIds.length > 0) {
                            const playerMap: {[key: string]: string} = {};
                            state.playerIds.forEach((id: string, index: number) => {
                                playerMap[id] = `Player ${index + 1}`;
                            });
                            setPlayers(playerMap);
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
    
    // Initialize or join match
    useEffect(() => {
        if (!user || !isConnected || matchInitialized) return;

        const initializeMatch = async () => {
            try {
                setIsLoading(true);
                setError(null);

                if (matchId) {
                    // Join existing match
                    const joinResponse = await onlineGameService.joinMatch(matchId, user.playerId);
                    
                    // Join WebSocket room
                    gameWebSocketService.joinMatch(matchId, user.playerId);
                    
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
                    
                    // Join WebSocket room
                    gameWebSocketService.joinMatch(createResponse.matchId, user.playerId);
                    
                    const mockMatch: OnlineMatchInfo = {
                        matchId: createResponse.matchId,
                        player1Id: user.playerId,
                        status: 'WAITING',
                        createdAt: new Date().toISOString()
                    };
                    setMatchInfo(mockMatch);
                }
                
                // Mark as initialized to prevent duplicate attempts
                setMatchInitialized(true);
            } catch (err) {
                setError('Failed to initialize match');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        initializeMatch();
    }, [user, matchId, isConnected, matchInitialized]);

    // Handle lobby events
    const handleGameStart = useCallback(() => {
        setIsInLobby(false);
        // Game state will come from WebSocket
        gameWebSocketService.requestGameState();
    }, []);

    const handleCancelMatch = useCallback(async () => {
        if (matchInfo) {
            gameWebSocketService.leaveMatch();
            // TODO: Call backend to cancel match
        }
        onBack();
    }, [onBack, matchInfo]);

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

    // Calculate valid moves
    useEffect(() => {
        if (!selectedCard || !gameState || !isMyTurn) {
            setValidMoves([]);
            return;
        }

        const moves: Position[] = [];
        
        // Check if board is empty (first move)
        const boardIsEmpty = Object.keys(gameState.board.pieces).length === 0;
        
        // Find positions where the current player can place cards
        for (let y = 0; y < DEFAULT_BOARD_HEIGHT; y++) {
            for (let x = 0; x < DEFAULT_BOARD_WIDTH; x++) {
                const posKey = `${x},${y}`;
                
                // Skip if position is occupied
                if (gameState.board.pieces[posKey]) continue;
                
                if (boardIsEmpty) {
                    // If board is empty, all positions are valid
                    moves.push({ x, y });
                } else {
                    // Check if adjacent to any card (simplified for online play)
                    const adjacentPositions = [
                        `${x-1},${y}`, `${x+1},${y}`,
                        `${x},${y-1}`, `${x},${y+1}`
                    ];
                    
                    const hasAdjacentCard = adjacentPositions.some(adjKey => {
                        return gameState.board.pieces[adjKey] !== undefined;
                    });
                    
                    if (hasAdjacentCard) {
                        moves.push({ x, y });
                    }
                }
            }
        }
        
        setValidMoves(moves);
    }, [selectedCard, gameState, isMyTurn, user]);

    // Handle card placement
    const handleCellClick = async (x: number, y: number) => {
        if (!selectedCard || !isMyTurn || !gameState || !matchInfo) return;
        
        const isValid = validMoves.some(move => move.x === x && move.y === y);
        if (!isValid) return;

        try {
            // Send move through REST API
            await gameService.makeMove(gameState.id, {
                playerId: user!.playerId,
                card: selectedCard,
                targetPosition: { x, y }
            });
            
            // Also notify via WebSocket for real-time updates
            const action = {
                type: 'PLACE_CARD',
                playerId: user!.playerId,
                card: selectedCard,
                targetPosition: { x, y }
            };
            gameWebSocketService.sendGameAction(action);
            
            // Clear selection (server will send updated state)
            setSelectedCard(null);
            setValidMoves([]);
            
            // Request updated game state
            setTimeout(() => {
                gameWebSocketService.requestGameState();
            }, 100);
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
            
            // Also notify via WebSocket
            const action = {
                type: 'PASS',
                playerId: user!.playerId
            };
            gameWebSocketService.sendGameAction(action);
            
            // Request updated game state
            setTimeout(() => {
                gameWebSocketService.requestGameState();
            }, 100);
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
            
            // Request updated game state
            setTimeout(() => {
                gameWebSocketService.requestGameState();
            }, 100);
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
            
            // Request updated game state
            setTimeout(() => {
                gameWebSocketService.requestGameState();
            }, 100);
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>Loading game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={onBack}>
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
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-2xl font-bold mb-4">Game Board</h2>
                            
                            {/* Board Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-6">
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
                                                x={x}
                                                y={y}
                                                card={card}
                                                isValidMove={isValidMove && isMyTurn}
                                                onClick={() => handleCellClick(x, y)}
                                            />
                                        );
                                    })
                                ).flat()}
                            </div>

                            {/* Your Hand (only visible when it's your turn) */}
                            <PlayerHand
                                cards={gameState.currentPlayerHand}
                                selectedCard={selectedCard}
                                onCardSelect={isMyTurn ? setSelectedCard : undefined}
                                disabled={!isMyTurn}
                            />

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant="secondary"
                                    onClick={handlePass}
                                    disabled={!isMyTurn}
                                >
                                    Pass Turn
                                </Button>
                                
                                {gameState.currentPlayerHand.length === 0 && isMyTurn && (
                                    <Button
                                        variant="default"
                                        onClick={handleWinRequest}
                                        disabled={!isMyTurn}
                                    >
                                        Request Win
                                    </Button>
                                )}
                                
                                {gameState.hasPendingWinRequest && 
                                 gameState.pendingWinRequestPlayerId !== user!.playerId && 
                                 isMyTurn && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            onClick={() => handleWinResponse(true)}
                                        >
                                            Accept Win
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleWinResponse(false)}
                                        >
                                            Reject Win
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-4">
                        {/* Players Info */}
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <h3 className="font-bold mb-3 flex items-center gap-2">
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
                                            onClick={onBack}
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