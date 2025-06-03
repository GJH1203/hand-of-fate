import { useState } from 'react';
import { gameService } from '@/services/gameService';
import type { Card, GameState, Position } from '@/types/game';

export const useGameState = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initializeGame = async (
        player1Id: string,
        player2Id: string,
        deck1Id: string,
        deck2Id: string
    ): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);
            const newGameState = await gameService.initializeGame(
                player1Id,
                player2Id,
                deck1Id,
                deck2Id
            );
            setGameState(newGameState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize game');
        } finally {
            setIsLoading(false);
        }
    };

    const makeMove = async (
        gameId: string,
        playerId: string,
        card: Card,
        position: Position
    ): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const updatedGameState = await gameService.makeMove(gameId, {
                type: 'PLACE_CARD',
                playerId,
                card,
                targetPosition: position,
                timestamp: Date.now()
            });

            setGameState(updatedGameState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to make move');
            throw err; // Re-throw so the UI can handle it
        } finally {
            setIsLoading(false);
        }
    };

    const requestWin = async (gameId: string, playerId: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);
            const updatedGameState = await gameService.requestWin(gameId, playerId);
            setGameState(updatedGameState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to request win');
        } finally {
            setIsLoading(false);
        }
    };

    const respondToWinRequest = async (
        gameId: string,
        playerId: string,
        acceptRequest: boolean
    ): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);
            const updatedGameState = await gameService.respondToWinRequest(gameId, playerId, acceptRequest);
            setGameState(updatedGameState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to respond to win request');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        gameState,
        isLoading,
        error,
        initializeGame,
        makeMove,
        requestWin,
        respondToWinRequest
    };
};
