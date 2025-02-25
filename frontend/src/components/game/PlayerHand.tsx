// components/game/PlayerHand.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
        if (!isCurrentTurn) return;

        if (selectedCard?.id === card.id) {
            onCardSelect(null); // Deselect if already selected
        } else {
            onCardSelect(card); // Select new card
        }
    };

    return (
        <div className={cn("mt-8", className)}>
            <h2 className="text-xl font-semibold mb-4 text-foreground">
                Your Hand {!isCurrentTurn && "(Waiting for opponent's move)"}
            </h2>
            <div className="flex gap-4 flex-wrap">
                {Array.isArray(cards) && cards.length > 0 ? (
                    // Use index as part of the key to ensure uniqueness
                    cards.map((card, index) => (
                        <Card
                            key={`hand-card-${card.id}-${index}`}
                            className={cn(
                                "w-24 h-32 flex flex-col items-center justify-center",
                                "transition-all duration-200",
                                isCurrentTurn && "hover:shadow-lg hover:border-primary cursor-pointer",
                                !isCurrentTurn && "opacity-50 cursor-not-allowed",
                                selectedCard?.id === card.id && "ring-2 ring-primary shadow-lg",
                                "group relative"
                            )}
                            onClick={() => handleCardClick(card)}
                        >
                            <CardContent className="p-3 flex flex-col items-center space-y-2">
                                <span className="text-2xl font-mono font-bold text-primary">
                                    {card.power}
                                </span>
                                <span className="text-sm text-center text-muted-foreground group-hover:text-foreground transition-colors">
                                    {card.name}
                                </span>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-muted-foreground">No cards in hand</div>
                )}
            </div>
        </div>
    );
}
