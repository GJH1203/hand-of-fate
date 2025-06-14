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
                                // Fallback when no image - show text
                                <div className="w-full h-full flex flex-col items-center justify-center space-y-1 p-3">
                                    <span className="text-3xl font-mono font-bold text-primary">
                                        {card.power}
                                    </span>
                                    <span className="text-sm text-center font-semibold text-foreground">
                                        {card.name}
                                    </span>
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
