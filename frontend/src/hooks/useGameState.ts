import { useState } from 'react';
import { gameService } from '@/services/gameService';
import type { GameState } from '@/types/game';

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

    return {
        gameState,
        isLoading,
        error,
        initializeGame
    };
};
