'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import { useGameState } from '@/hooks/useGameState';
import { Card, Position } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const DEFAULT_BOARD_WIDTH = 3;  // Adjusted to match backend
const DEFAULT_BOARD_HEIGHT = 5; // Adjusted to match backend

export default function GameBoard() {
    const { gameState, isLoading, error, initializeGame, makeMove, requestWin, respondToWinRequest } = useGameState();
    const { isAuthenticated, user } = useAuth();
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
            console.log('Board pieces in GameBoard:', gameState.board.pieces);
            console.log('Placed cards:', gameState.placedCards);
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
            console.log('Board cards set to:', cardMap);
        }
    }, [gameState]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth');
        }
    }, [isAuthenticated, router]);

    const createGameWithOpponent = async () => {
        if (!opponentName.trim() || !user) {
            return;
        }

        try {
            setIsCreatingGame(true);
            
            // Get current player data
            const currentPlayerResponse = await fetch(`http://localhost:8080/players/${user.playerId}`);
            if (!currentPlayerResponse.ok) {
                throw new Error('Failed to fetch current player data');
            }
            const currentPlayerData = await currentPlayerResponse.json();
            
            // Check if opponent exists
            const opponentResponse = await fetch(`http://localhost:8080/players/by-name/${encodeURIComponent(opponentName)}`);
            
            let opponentData;
            if (!opponentResponse.ok) {
                // Create opponent if doesn't exist
                const createOpponentResponse = await fetch(`http://localhost:8080/players?name=${encodeURIComponent(opponentName)}`, {
                    method: 'POST',
                });
                
                if (!createOpponentResponse.ok) {
                    throw new Error('Failed to create opponent player');
                }
                
                opponentData = await createOpponentResponse.json();
            } else {
                opponentData = await opponentResponse.json();
            }
            
            // Store player names
            setPlayers({
                [currentPlayerData.id]: currentPlayerData.name,
                [opponentData.id]: opponentData.name
            });
            
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

    const calculateValidMoves = (gameState: any): Position[] => {
        const positions: Position[] = [];
        const boardPieces = gameState.board.pieces || {};
        if (process.env.NODE_ENV === 'development') {
            console.log('Calculating valid moves, board pieces:', boardPieces);
            console.log('Current player ID:', gameState.currentPlayerId);
        }

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
        Object.entries(boardPieces).forEach(([posKey, cardId]: [string, unknown]) => {
            const [x, y] = posKey.split(',').map(Number);
            
            // Skip if we couldn't parse the position
            if (isNaN(x) || isNaN(y)) {
                console.error('Invalid position key:', posKey);
                return;
            }

            // Check if this card belongs to the current player
            const cardOwner = getCardOwnership(posKey, cardId as string);
            const isOwnCard = cardOwner === gameState.currentPlayerId;
            
            if (!isOwnCard) {
                console.log(`Skipping card ${cardId} at ${posKey} - not owned by current player`);
                return;
            }

            console.log(`Found own card ${cardId} at ${posKey}`);

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
                    console.log(`Added valid position: ${pos.x},${pos.y}`);
                }
            });
        });

        // Remove duplicates
        const uniquePositions = positions.filter((pos, index, self) =>
            index === self.findIndex(p => p.x === pos.x && p.y === pos.y)
        );
        console.log('Final valid positions:', uniquePositions);
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
            const positionKey = `${position.x},${position.y}`;
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg font-medium">Loading game...</div>
            </div>
        );
    }

    if (!gameState && showOpponentSelection) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6">
                <div className="text-2xl font-bold">Welcome to Hand of Fate</div>
                <div className="text-sm text-muted-foreground mb-4">
                    Playing as: {user?.username}
                </div>
                
                <div className="w-full max-w-md space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="opponent" className="text-sm font-medium">
                            Opponent Name
                        </label>
                        <input
                            id="opponent"
                            type="text"
                            value={opponentName}
                            onChange={(e) => setOpponentName(e.target.value)}
                            placeholder="Enter opponent's name"
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground">
                            If the opponent doesn&apos;t exist, they will be created automatically
                        </p>
                    </div>
                    
                    <Button
                        onClick={createGameWithOpponent}
                        size="lg"
                        className="w-full"
                        disabled={!opponentName.trim() || isCreatingGame}
                    >
                        {isCreatingGame ? 'Starting Game...' : 'Start Game'}
                    </Button>
                </div>
                
                {error && (
                    <div className="text-red-500 text-sm mt-4">
                        Error: {error}
                    </div>
                )}
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="text-lg font-medium">Loading game...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <div className="text-lg font-bold">
                        Current Turn: {players[gameState.currentPlayerId] || gameState.currentPlayerId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Game State: {gameState.state}
                    </div>
                    {/* Player color legend */}
                    <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                            <span className="text-xs text-blue-800 font-medium">
                                Your Cards
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
                            <span className="text-xs text-red-800 font-medium">
                                Opponent Cards
                            </span>
                        </div>
                    </div>
                </div>
                <Button
                    onClick={startNewGame}
                    variant="outline"
                    size="lg"
                >
                    New Game
                </Button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                    <p className="text-sm font-medium">Error: {error}</p>
                </div>
            )}

            {/* Winner Display */}
            {gameState.state === 'COMPLETED' && (
                <div className="mb-6 p-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-center mb-4">Game Complete!</h2>
                    {gameState.isTie ? (
                        <p className="text-xl text-center">It's a Tie!</p>
                    ) : (
                        <p className="text-xl text-center">
                            🎉 Winner: {players[gameState.winnerId || ''] || gameState.winnerId} 🎉
                        </p>
                    )}
                    {gameState.scores && (
                        <div className="mt-4 text-center">
                            <h3 className="text-lg font-semibold mb-2">Final Scores:</h3>
                            {Object.entries(gameState.scores).map(([playerId, score]) => (
                                <p key={playerId} className="text-md">
                                    {players[playerId] || playerId}: {score} points
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Win Request UI */}
            {gameState.state === 'IN_PROGRESS' && !gameState.hasPendingWinRequest && (
                <div className="mb-4 flex justify-center">
                    <Button
                        onClick={() => requestWin(gameState.id, gameState.currentPlayerId)}
                        variant="secondary"
                        disabled={gameState.currentPlayerId !== gameState.currentPlayerId} // Only current player can request
                    >
                        Request Early Win Calculation
                    </Button>
                </div>
            )}

            {/* Pending Win Request Display */}
            {gameState.hasPendingWinRequest && (
                <div className="mb-4 p-4 bg-amber-100 border-2 border-amber-400 rounded-lg">
                    <h3 className="text-lg font-semibold text-amber-800 mb-2">
                        Win Request Pending
                    </h3>
                    {gameState.pendingWinRequestPlayerId === gameState.currentPlayerId ? (
                        <p className="text-amber-700">
                            You have requested an early win calculation. Waiting for opponent's response...
                        </p>
                    ) : (
                        <div>
                            <p className="text-amber-700 mb-3">
                                {players[gameState.pendingWinRequestPlayerId || ''] || 'Opponent'} has requested an early win calculation.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => respondToWinRequest(gameState.id, gameState.currentPlayerId, true)}
                                    variant="default"
                                    size="sm"
                                >
                                    Accept
                                </Button>
                                <Button
                                    onClick={() => respondToWinRequest(gameState.id, gameState.currentPlayerId, false)}
                                    variant="outline"
                                    size="sm"
                                >
                                    Decline
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedCard && (
                <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
                    <p className="text-sm font-medium">
                        Selected card: {selectedCard.name} (Power: {selectedCard.power})
                    </p>
                    <p className="text-xs mt-1">Click on a highlighted cell to place this card</p>
                </div>
            )}

            <div className={`grid grid-cols-3 gap-4 mb-8 bg-secondary/20 p-4 rounded-lg ${gameState.state === 'COMPLETED' ? 'opacity-50 pointer-events-none' : ''}`}>
                {Array.from({ length: DEFAULT_BOARD_HEIGHT }, (_, y) =>
                    Array.from({ length: DEFAULT_BOARD_WIDTH }, (_, x) => {
                        const cellKey = `cell-${x}-${y}`;
                        const position = { x, y };
                        const positionString = `${x},${y}`;

                        // Get card from boardCards (which has processed the pieces)
                        const card = boardCards[positionString] || null;

                        // Check if this is a valid move position
                        const isValidMove = validMoves.some(pos => pos.x === x && pos.y === y);

                        return (
                            <GameCell
                                key={cellKey}
                                card={card}
                                position={position}
                                isValidMove={isValidMove}
                                onCellClick={handleCellClick}
                                selectedCard={selectedCard}
                                cardOwner={cardOwnership[positionString]}
                                currentPlayerId={gameState.currentPlayerId}
                                playerNames={players}
                            />
                        );
                    })
                ).flat()}
            </div>

            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">
                    Your Hand ({gameState.currentPlayerHand?.length || 0} cards)
                </h3>
                <PlayerHand
                    cards={gameState.currentPlayerHand || []}
                    isCurrentTurn={gameState.state === 'IN_PROGRESS'}
                    selectedCard={selectedCard}
                    onCardSelect={gameState.state === 'IN_PROGRESS' ? handleCardSelect : () => {}}
                />
            </div>
        </div>
    );
}
