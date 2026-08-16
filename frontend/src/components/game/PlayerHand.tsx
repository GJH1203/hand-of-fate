import React from 'react';
import { cn } from "@/lib/utils";
import type { Card as GameCard } from '@/types/game';

interface PlayerHandProps {
    cards: GameCard[];
    isCurrentTurn: boolean;
    selectedCard: GameCard | null;
    onCardSelect: (card: GameCard | null) => void;
    className?: string;
}

export default function PlayerHand({
                                       cards,
                                       isCurrentTurn,
                                       selectedCard,
                                       onCardSelect,
                                       className
                                   }: PlayerHandProps) {
    const handleCardClick = (card: GameCard) => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Card clicked:', card, 'isCurrentTurn:', isCurrentTurn);
        }
        if (!isCurrentTurn) {
            if (process.env.NODE_ENV === 'development') {
                console.log('Not current turn, ignoring click');
            }
            return;
        }

        if (selectedCard?.id === card.id) {
            if (process.env.NODE_ENV === 'development') {
                console.log('Deselecting card');
            }
            onCardSelect(null); // Deselect if already selected
        } else {
            if (process.env.NODE_ENV === 'development') {
                console.log('Selecting card:', card);
            }
            onCardSelect(card); // Select new card
        }
    };

    return (
        <div className={cn("", className)}>
            {!isCurrentTurn && (
                <p className="text-center text-sm text-gray-400 mb-2">
                    Waiting for opponent's move...
                </p>
            )}
            <div className="flex gap-4 flex-wrap justify-center">
                {Array.isArray(cards) && cards.length > 0 ? (
                    cards.map((card) => (
                        <div
                            key={card.id}
                            className={cn(
                                "w-24 h-32 rounded-lg overflow-hidden",
                                "transition-all duration-200",
                                isCurrentTurn && "card-hover cursor-pointer",
                                !isCurrentTurn && "opacity-50 cursor-not-allowed",
                                selectedCard?.id === card.id && "ring-2 ring-yellow-400 ring-offset-2 shadow-glow-yellow animate-pulse-ring",
                                "group relative"
                            )}
                            onClick={() => handleCardClick(card)}
                        >
                            {/* Card image fills entire card */}
                            {card.imageUrl ? (
                                <img 
                                    src={card.imageUrl} 
                                    alt={card.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                // Mystical card design when no image
                                <div className="w-full h-full relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 border-2 border-purple-500/50">
                                    {/* Magical card pattern overlay */}
                                    <div className="absolute inset-0 opacity-20">
                                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-500/20 to-transparent animate-pulse" />
                                        <div className="absolute top-2 left-2 w-4 h-4 border border-yellow-400/50 rotate-45" />
                                        <div className="absolute top-2 right-2 w-4 h-4 border border-yellow-400/50 rotate-45" />
                                        <div className="absolute bottom-2 left-2 w-4 h-4 border border-yellow-400/50 rotate-45" />
                                        <div className="absolute bottom-2 right-2 w-4 h-4 border border-yellow-400/50 rotate-45" />
                                    </div>
                                    
                                    {/* Card content */}
                                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-2">
                                        <div className="text-4xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] mb-1">
                                            {card.power}
                                        </div>
                                        <div className="text-xs text-center font-semibold text-purple-200 px-1">
                                            {card.name}
                                        </div>
                                    </div>
                                    
                                    {/* Glow effect for selected card */}
                                    {selectedCard?.id === card.id && (
                                        <div className="absolute inset-0 bg-yellow-400/20 rounded-lg animate-pulse" />
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-muted-foreground">No cards in hand</div>
                )}
            </div>
        </div>
    );
}
