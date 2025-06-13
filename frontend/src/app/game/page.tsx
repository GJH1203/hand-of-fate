'use client';

import { useState } from 'react';
import GameBoard from '@/components/game/GameBoard';
import GameModeSelection from '@/components/game/GameModeSelection';
import OnlineGameBoard from '@/components/game/OnlineGameBoard';
import { GameMode } from '@/types/gameMode';

export default function GamePage() {
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
    const [matchId, setMatchId] = useState<string | undefined>();

    const handleModeSelect = (mode: GameMode, matchIdParam?: string) => {
        setSelectedMode(mode);
        setMatchId(matchIdParam);
    };

    // If no mode selected, show mode selection
    if (!selectedMode) {
        return <GameModeSelection onModeSelect={handleModeSelect} />;
    }

    // For local mode, use existing GameBoard
    if (selectedMode === GameMode.LOCAL) {
        return (
            <div className="min-h-screen bg-background">
                <GameBoard />
            </div>
        );
    }

    // For online mode, use OnlineGameBoard
    return (
        <div className="min-h-screen bg-background">
            <OnlineGameBoard 
                key={`online-${matchId || 'new'}`}
                matchId={matchId} 
                onBack={() => {
                    setSelectedMode(null);
                    setMatchId(undefined);
                }} 
            />
        </div>
    );
}
