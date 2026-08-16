'use client';

import React from 'react';
import { ColumnScore } from '@/types/game';

interface ColumnIndicatorProps {
    columnIndex: number;
    columnScore?: ColumnScore;
    players: Record<string, string>; // playerid to name mapping
    currentPlayerId: string;
}

export default function ColumnIndicator({ columnIndex, columnScore, players, currentPlayerId }: ColumnIndicatorProps) {
    // Always show column header, even if no scores yet
    if (!columnScore || Object.keys(columnScore.playerScores || {}).length === 0) {
        return (
            <div className="h-20 flex flex-col items-center justify-center bg-black/60 rounded-lg p-2 border border-purple-500/50">
                <div className="text-sm font-bold text-gray-200">Column {columnIndex + 1}</div>
                <div className="text-xs text-gray-400 mt-1">No cards</div>
            </div>
        );
    }

    // Get the winning color for the column
    const getColumnColor = () => {
        if (columnScore.isTie) return 'from-gray-400 to-gray-600';
        if (!columnScore.winnerId) return 'from-gray-400 to-gray-600';
        if (columnScore.winnerId === currentPlayerId) return 'from-blue-400 to-blue-600';
        return 'from-red-400 to-red-600';
    };

    // Get scores for display
    const playerScores = Object.entries(columnScore.playerScores || {});

    return (
        <div className="h-20 flex flex-col items-center justify-between bg-black/60 rounded-lg p-2 border border-purple-500/50">
            {/* Column header */}
            <div className="text-sm font-bold text-purple-300">Column {columnIndex + 1}</div>
            
            {/* Winner indicator */}
            <div className={`
                px-3 py-1 rounded-lg text-xs font-bold text-white
                bg-gradient-to-r ${getColumnColor()}
                shadow-lg transform transition-all duration-300
                ${columnScore.winnerId && !columnScore.isTie ? 'animate-pulse' : ''}
            `}>
                {columnScore.isTie ? (
                    'TIE'
                ) : columnScore.winnerId ? (
                    players[columnScore.winnerId] || 'Player'
                ) : (
                    'Empty'
                )}
            </div>

            {/* Column scores */}
            <div className="flex gap-2 text-xs mt-1">
                {playerScores.map(([playerId, score]) => {
                    const isWinner = playerId === columnScore.winnerId && !columnScore.isTie;
                    const isCurrentPlayer = playerId === currentPlayerId;
                    return (
                        <div 
                            key={playerId} 
                            className={`
                                px-2 py-0.5 rounded
                                ${isWinner ? 'bg-yellow-500/30 text-yellow-300 font-bold shadow-glow-yellow' : 'bg-purple-900/40 text-gray-300'}
                                ${isCurrentPlayer ? 'border border-blue-400' : 'border border-transparent'}
                            `}
                        >
                            {score}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}