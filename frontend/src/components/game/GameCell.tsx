import React from 'react';
import { cn } from "@/lib/utils";
import type { Card, Position } from '@/types/game';

interface GameCellProps {
    card: Card | null;
    position: Position;
    isValidMove?: boolean;
    onCellClick?: (position: Position) => void;
    selectedCard?: Card | null;
    cardOwner?: string | null;
    currentPlayerId?: string;
    playerNames?: {[key: string]: string};
}

export default function GameCell({
                                     card,
                                     position,
                                     isValidMove = false,
                                     onCellClick,
                                     selectedCard,
                                     cardOwner,
                                     currentPlayerId,
                                     playerNames
                                 }: GameCellProps) {
    const handleClick = () => {
        if (onCellClick && !card) {
            onCellClick(position);
        }
    };

    // Determine player-specific styling
    const isCurrentPlayerCard = cardOwner === currentPlayerId;
    
    // Get player display info
    const getPlayerInfo = (playerId: string | null) => {
        if (!playerId) return { name: '', color: 'gray', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', textColor: 'text-gray-800' };
        
        const isCurrentPlayer = playerId === currentPlayerId;
        const playerName = playerNames?.[playerId] || playerId;
        
        if (isCurrentPlayer) {
            return {
                name: playerName,
                color: 'blue',
                bgColor: 'bg-blue-100',
                borderColor: 'border-blue-400',
                textColor: 'text-blue-800'
            };
        } else {
            return {
                name: playerName,
                color: 'red',
                bgColor: 'bg-red-100', 
                borderColor: 'border-red-400',
                textColor: 'text-red-800'
            };
        }
    };

    const playerInfo = getPlayerInfo(cardOwner);

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
                    "border-gray-300": !isValidMove || !selectedCard || !card,
                    "hover:bg-gray-50": !card && !isValidMove,
                },
                // Player-specific card styling
                card && playerInfo.bgColor,
                card && playerInfo.borderColor
            )}
        >
            {card && (
                <div className="flex flex-col items-center gap-1 relative w-full h-full justify-center">
                    {/* Player indicator badge */}
                    <div className={cn(
                        "absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded-full",
                        playerInfo.textColor,
                        isCurrentPlayerCard ? "bg-blue-200" : "bg-red-200"
                    )}>
                        {isCurrentPlayerCard ? "YOU" : "OPP"}
                    </div>
                    
                    {/* Card power */}
                    <div className={cn(
                        "text-2xl font-bold font-mono",
                        playerInfo.textColor
                    )}>
                        {card.power}
                    </div>
                    
                    {/* Card name */}
                    <span className={cn(
                        "text-xs font-medium truncate max-w-[80%] text-center",
                        playerInfo.textColor
                    )}>
                        {card.name}
                    </span>
                    
                    {/* Player name indicator */}
                    <div className={cn(
                        "absolute bottom-1 right-1 text-[10px] font-medium px-1 py-0.5 rounded",
                        playerInfo.textColor,
                        isCurrentPlayerCard ? "bg-blue-200/50" : "bg-red-200/50"
                    )}>
                        {playerInfo.name.length > 6 ? playerInfo.name.substring(0, 6) + "..." : playerInfo.name}
                    </div>
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
