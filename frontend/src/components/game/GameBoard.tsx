'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import { useGameState } from '@/hooks/useGameState';
import { Card, Position, GameState } from '@/types/game';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useRouter } from 'next/navigation';
import { playerService } from '@/services/playerService';

const DEFAULT_BOARD_WIDTH = 3;  // Adjusted to match backend
const DEFAULT_BOARD_HEIGHT = 5; // Adjusted to match backend

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
            
            // Check player data structure
            console.log('Current player data:', currentPlayerData);
            console.log('Opponent data:', opponentData);
            
            // Check if players have decks, create them if missing
            if (!currentPlayerData.currentDeck) {
                console.log('Current player missing deck, creating default deck...');
                const createDeckResponse = await fetch(`http://localhost:8080/players/${currentPlayerData.id}/create-deck`, {
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
                console.log('Opponent missing deck, creating default deck...');
                const createDeckResponse = await fetch(`http://localhost:8080/players/${opponentData.id}/create-deck`, {
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
            console.log('Initializing game with:', {
                player1: currentPlayerData.id,
                player2: opponentData.id,
                deck1: currentPlayerData.currentDeck.id,
                deck2: opponentData.currentDeck.id
            });
            
            await initializeGame(
                currentPlayerData.id, 
                opponentData.id, 
                currentPlayerData.currentDeck.id, 
                opponentData.currentDeck.id
            );
            
            console.log('Game initialization completed');
            
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
        Object.entries(boardPieces).forEach(([posKey, cardId]: [string, string]) => {
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
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center relative">
                <div className="relative z-10 flex flex-col items-center gap-6 p-8 bg-black/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30">
                    <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                        Welcome to Hand of Fate
                    </div>
                    <div className="text-sm text-gray-300 mb-4">
                        Playing as: {user?.username}
                    </div>
                    
                    <div className="w-full max-w-md space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="opponent" className="text-sm font-medium text-gray-200">
                                Opponent Name
                            </label>
                            <input
                                id="opponent"
                                type="text"
                                value={opponentName}
                                onChange={(e) => setOpponentName(e.target.value)}
                                placeholder="Enter opponent's name"
                                className="w-full px-3 py-2 bg-black/30 border border-purple-400/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-400"
                            />
                            <p className="text-xs text-gray-400">
                                The opponent must be registered first to play
                            </p>
                        </div>
                        
                        <Button
                            onClick={createGameWithOpponent}
                            size="lg"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white border-purple-400"
                            disabled={!opponentName.trim() || isCreatingGame}
                        >
                            {isCreatingGame ? 'Starting Game...' : 'Start Game'}
                        </Button>
                    </div>
                    
                    {error && (
                        <div className="text-red-400 text-sm mt-4 bg-red-900/20 p-2 rounded">
                            Error: {error}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center">
                <div className="text-lg font-medium text-gray-300">Loading game...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <div className="max-w-4xl mx-auto p-6 relative z-10">
            {/* Game Title */}
            <div className="text-center mb-8">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-2xl">
                    Hand of Fate
                </h1>
                <p className="text-lg text-gray-300 mt-2">Lightning Card Battle</p>
            </div>

            {/* Game Info Bar */}
            <div className="mb-8 bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-purple-500/30">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                            Current Turn: {players[gameState.currentPlayerId] || gameState.currentPlayerId}
                        </div>
                        <div className="text-sm text-gray-300">
                            Game State: {gameState.state}
                        </div>
                        {/* Player color legend */}
                        <div className="flex gap-4 mt-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-400 rounded shadow-glow-blue"></div>
                                <span className="text-xs text-blue-300 font-medium">
                                    Your Cards
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-400 rounded shadow-glow-red"></div>
                                <span className="text-xs text-red-300 font-medium">
                                    Opponent Cards
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={startNewGame}
                        variant="outline"
                        size="lg"
                        className="bg-purple-600/50 hover:bg-purple-600/70 border-purple-400 text-white"
                    >
                        New Game
                    </Button>
                </div>
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

            {/* Game Board Area */}
            <div className="flex justify-center mb-8">
                <div className="relative bg-black/40 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
                    {/* Arena Background */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30"
                        style={{
                            backgroundImage: "url('/backgrounds/battle-arena.png')",
                            filter: "blur(1px)"
                        }}
                    />
                    {/* Lightning overlay effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-400/10 to-transparent lightning-overlay" />
                    <div className="relative z-10 flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-center text-purple-300 mb-4 drop-shadow-lg">Battle Arena</h2>
                        <div className={`grid grid-cols-3 gap-1 w-fit mx-auto ${gameState.state === 'COMPLETED' ? 'opacity-50 pointer-events-none' : ''}`}>
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
                    </div>
                </div>
            </div>

            {/* Player Hand Area */}
            <div className="mt-6 relative bg-black/40 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
                {/* Wooden Background */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-70"
                    style={{
                        backgroundImage: "url('/backgrounds/wooden-table.png')",
                        filter: "brightness(0.7) contrast(1.1)"
                    }}
                />
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-4 text-yellow-400 text-center drop-shadow-lg">
                        Your Arsenal ({gameState.currentPlayerHand?.length || 0} cards)
                    </h3>
                    <PlayerHand
                        cards={gameState.currentPlayerHand || []}
                        isCurrentTurn={gameState.state === 'IN_PROGRESS'}
                        selectedCard={selectedCard}
                        onCardSelect={gameState.state === 'IN_PROGRESS' ? handleCardSelect : () => {}}
                    />
                </div>
            </div>
            </div>
        </div>
    );
}
