'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import GameCell from './GameCell';
import PlayerHand from './PlayerHand';
import { useGameState } from '@/hooks/useGameState';
import { playerService } from '@/services/playerService';
import type { Card } from '@/types/game';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GameBoard() {
    const { gameState, isLoading, error, initializeGame, makeMove } = useGameState();
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [initializingGame, setInitializingGame] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    const startNewGame = async () => {
        try {
            setInitializingGame(true);
            setInitError(null);

            // Get default deck IDs first
            const [player1Response, player2Response] = await Promise.all([
                playerService.createPlayer('Player 1'),
                playerService.createPlayer('Player 2')
            ]);

            // Validate the responses
            if (!player1Response?.id || !player2Response?.id) {
                throw new Error('Failed to create players: Invalid response');
            }

            // Get player details including their default decks
            const [player1Details, player2Details] = await Promise.all([
                playerService.getPlayer(player1Response.id),
                playerService.getPlayer(player2Response.id)
            ]);

            if (!player1Details?.currentDeck?.id || !player2Details?.currentDeck?.id) {
                throw new Error('Failed to get player deck information');
            }

            // Initialize game with players and their decks
            await initializeGame(
                player1Details.id,
                player2Details.id,
                player1Details.currentDeck.id,
                player2Details.currentDeck.id
            );

        } catch (err) {
            console.error('Failed to start game:', err);
            setInitError(err instanceof Error ? err.message : 'Failed to start game');
        } finally {
            setInitializingGame(false);
        }
    };

    const handleCellClick = async (position: number) => {
        if (!selectedCard || !gameState) return;

        try {
            // Convert linear position to x,y coordinates
            const x = position % gameState.board.width;
            const y = Math.floor(position / gameState.board.width);

            const success = await makeMove(
                gameState.currentPlayerId,
                selectedCard,
                position
            );

            if (success) {
                setSelectedCard(null);
            }
        } catch (err) {
            console.error('Failed to make move:', err);
        }
    };

    if (isLoading || initializingGame) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg font-medium">Loading game...</div>
            </div>
        );
    }

    if (error || initError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Alert variant="destructive">
                    <AlertDescription>
                        {error || initError}
                    </AlertDescription>
                </Alert>
                <Button
                    onClick={startNewGame}
                    variant="outline"
                >
                    Try Again
                </Button>
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
                    disabled={initializingGame}
                >
                    {initializingGame ? 'Starting New Game...' : 'New Game'}
                </Button>
            </div>

            <div className="mb-8 flex justify-between items-center">
                <div className="text-xl font-semibold">
                    Player 1: {gameState.scores?.player1 ?? 0}
                </div>
                <div className="text-xl font-semibold">
                    Player 2: {gameState.scores?.player2 ?? 0}
                </div>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-8 bg-secondary/20 p-4 rounded-lg">
                {Array.from({length: gameState.board.height}).map((_, y) =>
                    Array.from({length: gameState.board.width}).map((_, x) => {
                        const positionKey = `${x},${y}`;
                        const card = gameState.board.pieces[positionKey] || null;
                        const index = y * gameState.board.width + x;

                        return (
                            <GameCell
                                key={positionKey}
                                position={index}
                                card={card}
                                onCellClick={handleCellClick}
                                isValidMove={!card && gameState.validMoves?.includes(index)}
                                isSelected={selectedCard !== null}
                            />
                        );
                    })
                )}
            </div>

            <PlayerHand
                cards={gameState?.currentPlayerHand || []}
                selectedCard={selectedCard}
                onCardSelect={setSelectedCard}
            />
        </div>
    );
}
