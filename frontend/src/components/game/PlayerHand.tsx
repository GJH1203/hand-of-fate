import React from 'react';

import { cn } from '@/lib/utils';
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
    className,
}: PlayerHandProps) {
    const toggle = (card: GameCard) => {
        if (!isCurrentTurn) return;
        onCardSelect(selectedCard?.id === card.id ? null : card);
    };

    if (!Array.isArray(cards) || cards.length === 0) {
        return (
            <div className={cn('flex h-[128px] items-center justify-center', className)}>
                <p className="type-small text-ink-low">No cards left in hand</p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex items-end justify-center gap-3 transition-opacity duration-150',
                !isCurrentTurn && 'pointer-events-none opacity-50',
                className,
            )}
        >
            {cards.map((card) => {
                const selected = selectedCard?.id === card.id;
                return (
                    <button
                        key={card.id}
                        type="button"
                        onClick={() => toggle(card)}
                        aria-pressed={selected}
                        aria-label={`${card.name}, power ${card.power}`}
                        title={`${card.name} · ${card.power}`}
                        className={cn(
                            'relative h-[128px] w-[92px] shrink-0 overflow-hidden rounded-md border bg-surface-0',
                            'transition-transform duration-200 ease-arcane',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400',
                            selected
                                ? '-translate-y-3 border-gold-300 shadow-glow-gold'
                                : 'border-subtle hover:-translate-y-2',
                        )}
                    >
                        {card.imageUrl ? (
                            <img
                                src={card.imageUrl}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-ink-mid">
                                    {card.name}
                                </span>
                                <span className="font-display text-3xl font-bold text-gold-300 tabular">
                                    {card.power}
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
