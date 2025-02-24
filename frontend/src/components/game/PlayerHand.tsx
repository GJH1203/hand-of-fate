import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import type { Card as GameCard } from '@/types/game';

interface PlayerHandProps {
    cards: GameCard[];
    isCurrentTurn: boolean;
    className?: string;
}

export default function PlayerHand({
                                       cards,
                                       isCurrentTurn,
                                       className
                                   }: PlayerHandProps) {
    return (
        <div className={cn("mt-8", className)}>
            <h2 className="text-xl font-semibold mb-4 text-foreground">
                Your Hand {!isCurrentTurn && "(Waiting for opponent's move)"}
            </h2>
            <div className="flex gap-4 flex-wrap">
                {cards.map((card) => (
                    <Card
                        key={card.id}
                        className={cn(
                            "w-24 h-32 flex flex-col items-center justify-center",
                            "transition-all duration-200",
                            !isCurrentTurn && "opacity-50",
                            "group relative"
                        )}
                    >
                        <CardContent className="p-3 flex flex-col items-center space-y-2">
                            <span className="text-2xl font-mono font-bold text-primary">
                                {card.power}
                            </span>
                            <span className="text-sm text-center text-muted-foreground">
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
