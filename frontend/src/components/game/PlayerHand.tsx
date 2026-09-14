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
                <p className="type-small text-ink-low">Your hand is empty.</p>
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
                            // Spring easing, so a card picked up overshoots by a hair and
                            // settles — the difference between a card and a div that moved.
                            'transition-[transform,border-color,box-shadow] duration-300 ease-spring',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400',
                            selected
                                ? '-translate-y-4 border-ember-300 shadow-glow-ember'
                                : 'border-subtle hover:-translate-y-2 hover:border-strong',
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
                                <span className="type-label text-ink-mid">{card.name}</span>
                                <span className="text-3xl font-bold text-ember-300 tabular">
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
