import React, { useState, useEffect } from 'react';
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
    const [isNewlyPlaced, setIsNewlyPlaced] = useState(false);
    const [showRipple, setShowRipple] = useState(false);

    useEffect(() => {
        if (card && !isNewlyPlaced) {
            setIsNewlyPlaced(true);
            setShowRipple(true);
            setTimeout(() => setShowRipple(false), 600);
        }
    }, [card, isNewlyPlaced]);

    const handleClick = () => {
        if (onCellClick && !card) {
            onCellClick(position);
        }
    };

    // Determine player-specific styling
    const isCurrentPlayerCard = cardOwner === currentPlayerId;
    
    // Get player display info
    const getPlayerInfo = (playerId: string | null | undefined) => {
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
                "transition-all duration-200 relative overflow-hidden",
                // Empty cell styling - mystical arena slot
                !card && "bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-indigo-900/30 backdrop-blur-sm border-purple-500/30",
                !card && "hover:border-purple-400/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]",
                // Valid move highlighting
                isValidMove && selectedCard && !card && "border-green-400 bg-green-900/40 shadow-[0_0_20px_rgba(74,222,128,0.4)] animate-pulse",
                // Cursor states
                !card && "cursor-pointer",
                card && "cursor-not-allowed"
            )}
        >
            {/* Ripple effect when card is placed */}
            {showRipple && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-full h-full bg-yellow-400/50 rounded-lg ripple-effect" />
                </div>
            )}
            
            {card && (
                <div className={cn(
                    "flex flex-col items-center gap-1 relative w-full h-full justify-center overflow-hidden rounded-lg",
                    isNewlyPlaced && "card-slam"
                )}>
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
                        // Mystical card design for placed cards without images
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-br",
                            isCurrentPlayerCard 
                                ? "from-blue-800 via-blue-900 to-indigo-900" 
                                : "from-red-800 via-red-900 to-purple-900",
                            "border-2",
                            isCurrentPlayerCard ? "border-blue-500/50" : "border-red-500/50"
                        )}>
                            {/* Magical pattern overlay */}
                            <div className="absolute inset-0 opacity-30">
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent" />
                                <div className="absolute top-1 left-1 w-3 h-3 border border-yellow-400/30 rotate-45" />
                                <div className="absolute top-1 right-1 w-3 h-3 border border-yellow-400/30 rotate-45" />
                                <div className="absolute bottom-1 left-1 w-3 h-3 border border-yellow-400/30 rotate-45" />
                                <div className="absolute bottom-1 right-1 w-3 h-3 border border-yellow-400/30 rotate-45" />
                            </div>
                            
                            {/* Player indicator badge */}
                            <div className={cn(
                                "absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full z-20",
                                "backdrop-blur-sm shadow-lg",
                                isCurrentPlayerCard 
                                    ? "bg-blue-400/80 text-blue-900" 
                                    : "bg-red-400/80 text-red-900"
                            )}>
                                {isCurrentPlayerCard ? "YOU" : "OPP"}
                            </div>
                            
                            {/* Card content */}
                            <div className="relative z-10 flex flex-col items-center justify-center h-full">
                                <div className="text-3xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                                    {card.power}
                                </div>
                                <div className="text-[10px] font-semibold text-gray-200 mt-1 px-1 text-center">
                                    {card.name}
                                </div>
                            </div>
                            
                            {/* Player name indicator */}
                            <div className={cn(
                                "absolute bottom-1 right-1 text-[9px] font-medium px-1 py-0.5 rounded z-20",
                                "backdrop-blur-sm shadow-lg",
                                isCurrentPlayerCard 
                                    ? "bg-blue-400/80 text-blue-900" 
                                    : "bg-red-400/80 text-red-900"
                            )}>
                                {playerInfo.name.length > 6 ? playerInfo.name.substring(0, 6) + "..." : playerInfo.name}
                            </div>
                        </div>
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
