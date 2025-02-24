'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import { useGameState } from '@/hooks/useGameState';

const DEFAULT_BOARD_HEIGHT = 3;
const DEFAULT_BOARD_WIDTH = 5;

export default function GameBoard() {
    const { gameState, isLoading, error, initializeGame } = useGameState();

    const startNewGame = async () => {
        try {
            const player1Id = "67bbfc0af8248403accf7b92";
            const player2Id = "67bbfc0ff8248403accf7b93";
            const deck1Id = "657f8046-371b-40ef-a7ec-7ec0044a5249";
            const deck2Id = "a4110483-2be6-416d-8a87-960774cd5642";

            await initializeGame(player1Id, player2Id, deck1Id, deck2Id);
        } catch (err) {
            console.error('Failed to start game:', err);
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
                <div className="text-lg font-medium">Welcome to Queen's Blood</div>
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

            <div className="grid grid-cols-5 gap-4 mb-8 bg-secondary/20 p-4 rounded-lg">
                {Array.from({ length: DEFAULT_BOARD_HEIGHT }).map((_, y) =>
                    Array.from({ length: DEFAULT_BOARD_WIDTH }).map((_, x) => {
                        const positionKey = `${x},${y}`;
                        const card = gameState.board.pieces[positionKey] || null;

                        return (
                            <GameCell
                                key={positionKey}
                                card={card}
                                position={{ x, y }}
                            />
                        );
                    })
                )}
            </div>

            <PlayerHand
                cards={gameState.currentPlayerHand}
                isCurrentTurn={true}
            />
        </div>
    );
}
