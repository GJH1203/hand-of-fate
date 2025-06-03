import React from 'react';
import { cn } from "@/lib/utils";
import type { Card, Position } from '@/types/game';

interface GameCellProps {
    card: Card | null;
    position: Position;
    isValidMove?: boolean;
    onCellClick?: (position: Position) => void;
    selectedCard?: Card | null;
}

export default function GameCell({
                                     card,
                                     position,
                                     isValidMove = false,
                                     onCellClick,
                                     selectedCard
                                 }: GameCellProps) {
    const handleClick = () => {
        if (onCellClick && !card) {
            onCellClick(position);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                "h-24 w-full rounded-lg border-2 flex items-center justify-center",
                "transition-all duration-200 relative",
                {
                    "cursor-pointer hover:shadow-md": !card,
                    "cursor-not-allowed": card,
                    "border-green-500 bg-green-50 hover:bg-green-100 shadow-lg": isValidMove && selectedCard && !card,
                    "border-gray-300": !isValidMove || !selectedCard,
                    "bg-white": card,
                    "hover:bg-gray-50": !card && !isValidMove,
                }
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

            {isValidMove && selectedCard && (
                <div className="absolute top-1 right-1">
                    <span className="text-xs bg-primary/10 px-1 py-0.5 rounded">
                        Valid
                    </span>
                </div>
            )}
        </div>
    );
}
