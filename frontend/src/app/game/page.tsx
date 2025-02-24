'use client';

import GameBoard from '@/components/game/GameBoard';
import PlayerHand from '@/components/game/PlayerHand';
import { useGameState } from '@/hooks/useGameState';
import { useEffect } from 'react';

export default function GamePage() {
    const { gameState, initializeGame } = useGameState();

    useEffect(() => {
        const startGame = async () => {
            console.log("Starting game initialization...");
            try {
                await initializeGame(
                    "67bbfc0af8248403accf7b92",  // P1
                    "67bbfc0ff8248403accf7b93",  // P2
                    "bd1cb7af-918f-4588-92bf-2ae26ce87f61",  // P1's deck
                    "d158ba5f-b147-4f18-b35e-285d710787e6"   // P2's deck
                );
            } catch (error) {
                console.error("Error initializing game:", error);
            }
        };

        startGame();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <GameBoard />
            {gameState && (
                <PlayerHand
                    cards={gameState.currentPlayerHand || []}
                    selectedCard={null}
                    onCardSelect={() => {}}
                    isCurrentTurn={true}
                />
            )}
        </div>
    );
}
