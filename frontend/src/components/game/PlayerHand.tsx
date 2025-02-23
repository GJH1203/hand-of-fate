import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import type { Card as GameCard } from '@/types/game';

interface PlayerHandProps {
    cards: GameCard[];
    selectedCard: GameCard | null;
    onCardSelect: (card: GameCard) => void;
}

export default function PlayerHand({
                                       cards,
                                       selectedCard,
                                       onCardSelect
                                   }: PlayerHandProps) {
    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Your Hand</h2>
            <div className="flex gap-4 flex-wrap">
                {Array.isArray(cards) && cards.map((card) => (
                    <Card
                        key={card.id}
                        className={cn(
                            "w-24 h-32 flex flex-col items-center justify-center cursor-pointer",
                            "transition-all duration-200 hover:shadow-lg hover:border-primary",
                            "group relative",
                            selectedCard?.id === card.id && "ring-2 ring-primary shadow-lg"
                        )}
                        onClick={() => onCardSelect(card)}
                    >
                        <CardContent className="p-3 flex flex-col items-center space-y-2">
                            <span className="text-2xl font-mono font-bold text-primary">{card.power}</span>
                            <span className="text-sm text-center text-muted-foreground group-hover:text-foreground transition-colors">
                                {card.name}
                            </span>
                        </CardContent>
                    </Card>
                ))}
                {(!cards || cards.length === 0) && (
                    <div className="text-muted-foreground">No cards in hand</div>
                )}
            </div>
        </div>
    );
}
