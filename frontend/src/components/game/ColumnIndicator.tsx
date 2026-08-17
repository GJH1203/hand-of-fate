'use client';

import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { ColumnScore } from '@/types/game';

interface ColumnIndicatorProps {
    columnIndex: number;
    columnScore?: ColumnScore;
    players: Record<string, string>;
    currentPlayerId: string;
}

/**
 * The strip above a column: whose it is, and by how much.
 *
 * It is one row tall and the same width as the column, because the board and the
 * hand have to share the viewport with it. The leader is the strip's colour — gold
 * for you, crimson for them — which is the same language the cards on the board use.
 */
export default function ColumnIndicator({
    columnIndex,
    columnScore,
    players,
    currentPlayerId,
}: ColumnIndicatorProps) {
    const scores = columnScore?.playerScores ?? {};
    const mine = scores[currentPlayerId] ?? 0;
    const theirId = Object.keys(players).find((id) => id !== currentPlayerId);
    const theirs = theirId ? (scores[theirId] ?? 0) : 0;

    const leader: 'me' | 'them' | 'none' =
        columnScore?.isTie || !columnScore?.winnerId
            ? 'none'
            : columnScore.winnerId === currentPlayerId
              ? 'me'
              : 'them';

    // A score that changes gets a beat of attention; a score that has not, does not.
    const [bumping, setBumping] = useState(false);
    const previous = useRef(`${mine}:${theirs}`);
    useEffect(() => {
        const key = `${mine}:${theirs}`;
        if (previous.current !== key) {
            previous.current = key;
            setBumping(true);
            const timer = window.setTimeout(() => setBumping(false), 300);
            return () => window.clearTimeout(timer);
        }
    }, [mine, theirs]);

    const leaderName =
        leader === 'me'
            ? 'You'
            : leader === 'them' && theirId
              ? players[theirId]
              : undefined;

    return (
        <div
            title={
                leaderName
                    ? `Column ${columnIndex + 1} — ${leaderName} leads ${Math.max(mine, theirs)} to ${Math.min(mine, theirs)}`
                    : `Column ${columnIndex + 1} — level at ${mine}`
            }
            className={cn(
                'flex h-11 flex-col items-center justify-center rounded-md border bg-surface-1',
                leader === 'me' && 'border-gold-400/45',
                leader === 'them' && 'border-danger/45',
                leader === 'none' && 'border-subtle',
            )}
        >
            <span className="type-micro leading-none text-ink-low">Col {columnIndex + 1}</span>
            <span
                className="mt-1 flex items-baseline gap-1 font-display text-base font-bold leading-none tabular"
                style={bumping ? { animation: 'score-pop 300ms ease-out' } : undefined}
            >
                <span className={leader === 'me' ? 'text-gold-300' : 'text-ink-mid'}>{mine}</span>
                <span className="text-[11px] font-normal text-ink-low">:</span>
                <span className={leader === 'them' ? 'text-danger' : 'text-ink-mid'}>{theirs}</span>
            </span>
        </div>
    );
}
