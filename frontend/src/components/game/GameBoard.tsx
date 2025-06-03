'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import { useGameState } from '@/hooks/useGameState';
import { Card, Position } from '@/types/game';

const DEFAULT_BOARD_WIDTH = 3;  // Adjusted to match backend
const DEFAULT_BOARD_HEIGHT = 5; // Adjusted to match backend

export default function GameBoard() {
    const { gameState, isLoading, error, initializeGame, makeMove, requestWin, respondToWinRequest } = useGameState();
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);
    const [boardCards, setBoardCards] = useState<Record<string, Card>>({});
    const [showPlayerForm, setShowPlayerForm] = useState(true);
    const [player1Name, setPlayer1Name] = useState('');
    const [player2Name, setPlayer2Name] = useState('');
    const [isCreatingPlayers, setIsCreatingPlayers] = useState(false);
    const [players, setPlayers] = useState<{[key: string]: string}>({});

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

    const createPlayersAndStartGame = async () => {
        if (!player1Name.trim() || !player2Name.trim()) {
            return;
        }

        try {
            setIsCreatingPlayers(true);
            
            // Create Player 1
            const player1Response = await fetch(`http://localhost:8080/players?name=${encodeURIComponent(player1Name)}`, {
                method: 'POST',
            });
            
            if (!player1Response.ok) {
                throw new Error('Failed to create Player 1');
            }
            
            const player1Data = await player1Response.json();
            
            // Create Player 2
            const player2Response = await fetch(`http://localhost:8080/players?name=${encodeURIComponent(player2Name)}`, {
                method: 'POST',
            });
            
            if (!player2Response.ok) {
                throw new Error('Failed to create Player 2');
            }
            
            const player2Data = await player2Response.json();
            
            // Store player names
            setPlayers({
                [player1Data.id]: player1Data.name,
                [player2Data.id]: player2Data.name
            });
            
            // Start game with created players
            await initializeGame(
                player1Data.id, 
                player2Data.id, 
                player1Data.currentDeck.id, 
                player2Data.currentDeck.id
            );
            
            setShowPlayerForm(false);
            setSelectedCard(null);
            setValidMoves([]);
        } catch (err) {
            console.error('Failed to create players and start game:', err);
        } finally {
            setIsCreatingPlayers(false);
        }
    };

    const startNewGame = () => {
        setShowPlayerForm(true);
        setPlayer1Name('');
        setPlayer2Name('');
        setSelectedCard(null);
        setValidMoves([]);
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
        console.log('Calculating valid moves, board pieces:', boardPieces);

        // Check if there are any pieces on the board
        const playerPieces = Object.entries(boardPieces)
            .filter(([_, cardId]) => {
                // Check if this card belongs to the current player
                const card = gameState.placedCards?.[cardId];
                return card !== undefined; // For now, just check if card exists
            });

        // Check if there are any pieces from the current player
        const currentPlayerHasPieces = Object.entries(boardPieces).some(([_, cardId]) => {
            // Check if this card belongs to current player (we need to check placedCards)
            return gameState.placedCards && gameState.placedCards[cardId];
        });
        
        console.log('Current player has pieces:', currentPlayerHasPieces);

        // Find all valid adjacent positions to existing pieces
        Object.keys(boardPieces).forEach(posKey => {
            const [x, y] = posKey.split(',').map(Number);
            
            // Skip if we couldn't parse the position
            if (isNaN(x) || isNaN(y)) {
                console.error('Invalid position key:', posKey);
                return;
            }

            // Check all adjacent positions (orthogonal and diagonal)
            const adjacentPositions = [
                { x: x-1, y: y }, { x: x+1, y: y },    // left, right
                { x: x, y: y-1 }, { x: x, y: y+1 },    // top, bottom
                { x: x-1, y: y-1 }, { x: x+1, y: y-1 }, // top-left, top-right
                { x: x-1, y: y+1 }, { x: x+1, y: y+1 }  // bottom-left, bottom-right
            ];

            adjacentPositions.forEach(pos => {
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
        console.log('Valid positions:', uniquePositions);
        return uniquePositions;
    };

    const handleCellClick = async (position: Position) => {
        // Check if this is an empty position
        const positionKey = `${position.x},${position.y}`;
        const isOccupied = gameState.board.pieces && gameState.board.pieces[positionKey];
        
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

    if (!gameState && showPlayerForm) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6">
                <div className="text-2xl font-bold">Welcome to Hand of Fate</div>
                <div className="text-sm text-muted-foreground mb-4">Create two players to start the game</div>
                
                <div className="w-full max-w-md space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="player1" className="text-sm font-medium">
                            Player 1 Name
                        </label>
                        <input
                            id="player1"
                            type="text"
                            value={player1Name}
                            onChange={(e) => setPlayer1Name(e.target.value)}
                            placeholder="Enter Player 1 name"
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="player2" className="text-sm font-medium">
                            Player 2 Name
                        </label>
                        <input
                            id="player2"
                            type="text"
                            value={player2Name}
                            onChange={(e) => setPlayer2Name(e.target.value)}
                            placeholder="Enter Player 2 name"
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    
                    <Button
                        onClick={createPlayersAndStartGame}
                        size="lg"
                        className="w-full"
                        disabled={!player1Name.trim() || !player2Name.trim() || isCreatingPlayers}
                    >
                        {isCreatingPlayers ? 'Creating Players...' : 'Create Players & Start Game'}
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
