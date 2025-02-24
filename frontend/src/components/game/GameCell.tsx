import React from 'react';
import { cn } from "@/lib/utils";
import type { Card } from '@/types/game';

interface GameCellProps {
    card: Card | null;
    position: { x: number; y: number };
}

export default function GameCell({ card, position }: GameCellProps) {
    return (
        <div
            className={cn(
                "h-24 w-full rounded-lg border-2 flex items-center justify-center",
                "transition-all duration-200 relative",
                "border-muted",
                card ? "bg-card" : "bg-background"
            )}
        >
            {card && (
                <div className="flex flex-col items-center gap-1">
                    <div className="text-2xl font-bold font-mono">
                        {card.power}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground truncate max-w-[80%] text-center">
                        {card.name}
                    </span>
                </div>
            )}
        </div>
    );
}
