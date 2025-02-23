// src/hooks/useGameState.ts
'use client';

import { useState, useEffect } from 'react';
import { gameService } from '@/services/gameService';
import type { Card, GameState } from '@/types/game';

export const useGameState = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [gameId, setGameId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initializeGame = async (
        player1Id: string,
        player2Id: string,
        deck1Id: string,
        deck2Id: string
    ): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);
            const gameData = await gameService.initializeGame(
                player1Id,
                player2Id,
                deck1Id,
                deck2Id
            );
            setGameState(gameData);
            setGameId(gameData.id);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const makeMove = async (
        playerId: string,
        card: Card,
        position: number
    ): Promise<boolean> => {
        if (!gameId) {
            setError('No active game');
            return false;
        }

        try {
            setError(null);
            const updatedState = await gameService.makeMove(gameId, {
                playerId,
                card,
                position
            });
            setGameState(updatedState);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            return false;
        }
    };

    useEffect(() => {
        if (!gameId) return;

        const fetchGameState = async () => {
            try {
                const data = await gameService.getGame(gameId);
                setGameState(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            }
        };

        fetchGameState();
        const interval = setInterval(fetchGameState, 1000);
        return () => clearInterval(interval);
    }, [gameId]);

    return {
        gameState,
        isLoading,
        error,
        initializeGame,
        makeMove
    };
};
