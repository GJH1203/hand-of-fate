'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import { useGameState } from '@/hooks/useGameState';
import { Card, Position } from '@/types/game';

const DEFAULT_BOARD_HEIGHT = 3;
const DEFAULT_BOARD_WIDTH = 5;

export default function GameBoard() {
    const { gameState, isLoading, error, initializeGame, makeMove } = useGameState();
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);

    const startNewGame = async () => {
        try {
            const player1Id = "67bbfc0af8248403accf7b92";
            const player2Id = "67bbfc0ff8248403accf7b93";
            const deck1Id = "657f8046-371b-40ef-a7ec-7ec0044a5249";
            const deck2Id = "a4110483-2be6-416d-8a87-960774cd5642";

            await initializeGame(player1Id, player2Id, deck1Id, deck2Id);
            setSelectedCard(null);
            setValidMoves([]);
        } catch (err) {
            console.error('Failed to start game:', err);
        }
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

        // Check if there are any pieces on the board
        const playerPieces = Object.entries(boardPieces)
            .filter(([_, piece]: [string, any]) => piece && piece.ownerId === gameState.currentPlayerId);

        // If no pieces are placed yet, allow anywhere (or specific starting positions)
        if (Object.keys(boardPieces).length === 0) {
            // For initial moves, maybe limit to certain positions
            // For now, let's allow the middle positions
            positions.push({ x: 2, y: 1 });
            return positions;
        }

        // Find all valid adjacent positions to existing pieces
        Object.keys(boardPieces).forEach(posKey => {
            const [x, y] = posKey.split(',').map(Number);

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
        return positions.filter((pos, index, self) =>
            index === self.findIndex(p => p.x === pos.x && p.y === pos.y)
        );
    };

    const handleCellClick = async (position: Position) => {
        // Only allow placing cards on valid moves
        const isValidMove = validMoves.some(pos => pos.x === position.x && pos.y === position.y);

        if (!selectedCard || !gameState || !isValidMove) {
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

    if (!gameState) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="text-lg font-medium">Welcome to Queen&apos;s Blood</div>
                <Button
                    onClick={startNewGame}
                    size="lg"
                    className="px-8"
                >
                    Start Game
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8 flex justify-between items-center">
                <div className="text-lg font-bold">
                    Current Player: {gameState.currentPlayerId}
                </div>
                <Button
                    onClick={startNewGame}
                    variant="outline"
                    size="lg"
                >
                    New Game
                </Button>
            </div>

            {selectedCard && (
                <div className="mb-4 p-2 bg-primary/5 rounded-lg">
                    <p className="text-sm font-medium">
                        Selected card: {selectedCard.name} ({selectedCard.power})
                    </p>
                </div>
            )}

            <div className="grid grid-cols-5 gap-4 mb-8 bg-secondary/20 p-4 rounded-lg">
                {Array.from({ length: DEFAULT_BOARD_HEIGHT }).flatMap((_, y) =>
                    Array.from({ length: DEFAULT_BOARD_WIDTH }).map((_, x) => {
                        const cellKey = `cell-${x}-${y}`;
                        const position = { x, y };
                        const positionString = `${x},${y}`;
                        const card = gameState.board.pieces[positionString] || null;

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
                )}
            </div>

            <PlayerHand
                cards={gameState.currentPlayerHand || []}
                isCurrentTurn={true}
                selectedCard={selectedCard}
                onCardSelect={handleCardSelect}
            />
        </div>
    );
}
