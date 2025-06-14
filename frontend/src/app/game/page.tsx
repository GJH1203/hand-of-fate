'use client';

import { useState } from 'react';
import GameBoard from '@/components/game/GameBoard';
import GameModeSelection from '@/components/game/GameModeSelection';
import OnlineGameBoard from '@/components/game/OnlineGameBoard';
import ParticleEffect from '@/components/effects/ParticleEffect';
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
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,80,200,0.3)_0%,transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(80,120,200,0.3)_0%,transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,200,0.2)_0%,transparent_50%)]"></div>
                </div>
                {/* Particle effects */}
                <ParticleEffect />
                <GameBoard />
            </div>
        );
    }

    // For online mode, use OnlineGameBoard
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,80,200,0.3)_0%,transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(80,120,200,0.3)_0%,transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,200,0.2)_0%,transparent_50%)]"></div>
            </div>
            {/* Particle effects */}
            <ParticleEffect />
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
