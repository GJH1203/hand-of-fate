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
                "h-24 w-24 rounded-lg border-2 flex items-center justify-center",
                "transition-all duration-200 relative",
                {
                    "cursor-pointer hover:shadow-md hover:border-purple-400": !card,
                    "cursor-not-allowed": card,
                    "border-green-400 bg-green-900/20 hover:bg-green-900/30 shadow-glow-green": isValidMove && selectedCard && !card,
                    "border-gray-600 bg-gray-900/20": !isValidMove || !selectedCard || !card,
                    "hover:bg-gray-800/30": !card && !isValidMove,
                },
                // Player-specific card styling
                card && playerInfo.bgColor,
                card && playerInfo.borderColor
            )}
        >
            {card && (
                <div className="flex flex-col items-center gap-1 relative w-full h-full justify-center overflow-hidden rounded-lg">
                    {/* Card image fills the cell */}
                    {card.imageUrl ? (
                        <>
                            <img 
                                src={card.imageUrl} 
                                alt={card.name}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            
                            {/* Player indicator badges with semi-transparent background */}
                            <div className={cn(
                                "absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded-full z-20",
                                "backdrop-blur-sm",
                                isCurrentPlayerCard ? "bg-blue-200/90 text-blue-800" : "bg-red-200/90 text-red-800"
                            )}>
                                {isCurrentPlayerCard ? "YOU" : "OPP"}
                            </div>
                            
                            <div className={cn(
                                "absolute bottom-1 right-1 text-[10px] font-medium px-1 py-0.5 rounded z-20",
                                "backdrop-blur-sm",
                                isCurrentPlayerCard ? "bg-blue-200/90 text-blue-800" : "bg-red-200/90 text-red-800"
                            )}>
                                {playerInfo.name.length > 6 ? playerInfo.name.substring(0, 6) + "..." : playerInfo.name}
                            </div>
                        </>
                    ) : (
                        // Fallback when no image - show original card layout
                        <>
                            {/* Player indicator badge */}
                            <div className={cn(
                                "absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded-full z-20",
                                playerInfo.textColor,
                                isCurrentPlayerCard ? "bg-blue-200" : "bg-red-200"
                            )}>
                                {isCurrentPlayerCard ? "YOU" : "OPP"}
                            </div>
                            
                            {/* Card content */}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className={cn(
                                    "text-2xl font-bold font-mono",
                                    playerInfo.textColor
                                )}>
                                    {card.power}
                                </div>
                                
                                <span className={cn(
                                    "text-xs font-semibold truncate max-w-[80%] text-center",
                                    playerInfo.textColor
                                )}>
                                    {card.name}
                                </span>
                            </div>
                            
                            {/* Player name indicator */}
                            <div className={cn(
                                "absolute bottom-1 right-1 text-[10px] font-medium px-1 py-0.5 rounded z-20",
                                playerInfo.textColor,
                                isCurrentPlayerCard ? "bg-blue-200/80" : "bg-red-200/80"
                            )}>
                                {playerInfo.name.length > 6 ? playerInfo.name.substring(0, 6) + "..." : playerInfo.name}
                            </div>
                        </>
                    )}
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
