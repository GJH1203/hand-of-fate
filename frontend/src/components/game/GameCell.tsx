import React from 'react';
import { cn } from "@/lib/utils";
import type { Card } from '@/types/game';

interface GameCellProps {
    position: number;
    card: Card | null;
    onCellClick: (position: number) => void;
    isValidMove: boolean;
    isSelected: boolean;
}

export default function GameCell({
                                     position,
                                     card,
                                     onCellClick,
                                     isValidMove,
                                     isSelected
                                 }: GameCellProps) {
    return (
        <div
            onClick={() => onCellClick(position)}
            className={cn(
                "h-24 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200",
                "hover:shadow-md",
                isValidMove && isSelected ? "border-primary hover:bg-primary/10" : "border-muted",
                card ? "bg-card" : "hover:bg-accent/50",
            )}
        >
            {card && (
                <div
                    className={cn(
                        "text-2xl font-bold flex flex-col items-center",
                        card.player === 1 ? "text-blue-600" : "text-red-600"
                    )}
                >
                    <span className="font-mono">{card.power}</span>
                    <span className="text-xs mt-1 font-medium text-muted-foreground">{card.name}</span>
                </div>
            )}
        </div>
    );
}
