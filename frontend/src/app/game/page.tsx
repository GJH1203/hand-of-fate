'use client';

import { useState } from 'react';
import GameBoard from '@/components/game/GameBoard';
import GameModeSelection from '@/components/game/GameModeSelection';
import OnlineGameBoard from '@/components/game/OnlineGameBoard';
import { GameMode } from '@/types/gameMode';

/*
 * The shell used to wrap every screen in its own purple gradient and a particle
 * field. Both are gone: the background is one shared layer in the root layout, and
 * the arena needs the full viewport height with nothing wrapping it.
 */
export default function GamePage() {
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
    const [matchId, setMatchId] = useState<string | undefined>();

    const handleModeSelect = (mode: GameMode, matchIdParam?: string) => {
        setSelectedMode(mode);
        setMatchId(matchIdParam);
    };

    if (!selectedMode) {
        return <GameModeSelection onModeSelect={handleModeSelect} />;
    }

    if (selectedMode === GameMode.LOCAL) {
        return <GameBoard />;
    }

    return (
        <OnlineGameBoard
            key={`online-${matchId || 'new'}`}
            matchId={matchId}
            onBack={() => {
                setSelectedMode(null);
                setMatchId(undefined);
            }}
        />
    );
}
