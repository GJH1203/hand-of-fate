'use client';

import React from 'react';
import { Handshake, Shield, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import type { ColumnScore } from '@/types/game';

type Outcome = 'win' | 'loss' | 'tie';

interface GameResultModalProps {
  open: boolean;
  outcome: Outcome;
  /** Column index to score, as the server calculated it. */
  columnScores: Record<number, ColumnScore>;
  players: Record<string, string>;
  currentPlayerId: string;
  columnsWon: Record<string, number>;
  onReturn: () => void;
}

const HEADLINES: Record<Outcome, string> = {
  win: 'VICTORY',
  loss: 'DEFEAT',
  tie: 'STALEMATE',
};

/** How the duel ends. Never `window.alert`, and never a banner you have to scroll to. */
export default function GameResultModal({
  open,
  outcome,
  columnScores,
  players,
  currentPlayerId,
  columnsWon,
  onReturn,
}: GameResultModalProps) {
  const theirId = Object.keys(players).find((id) => id !== currentPlayerId);
  const Icon = outcome === 'win' ? Trophy : outcome === 'tie' ? Handshake : Shield;

  return (
    <Modal
      open={open}
      onClose={onReturn}
      showCloseButton={false}
      closeOnOverlayClick={false}
      widthClassName="max-w-[480px]"
    >
      <div className="pt-2 text-center">
        <Icon
          size={48}
          strokeWidth={1.5}
          className={cn(
            'mx-auto',
            outcome === 'win' ? 'text-gold-400' : outcome === 'tie' ? 'text-info' : 'text-ink-low',
          )}
        />
        <h2
          className={cn(
            'mt-4 font-display text-[40px] font-bold leading-none tracking-[0.06em]',
            outcome === 'win' ? 'text-gold-gradient' : 'text-ink-mid',
          )}
        >
          {HEADLINES[outcome]}
        </h2>
        <div
          className={cn(
            'mx-auto mt-4 h-px w-40',
            outcome === 'win' ? 'rule-gold' : 'bg-white/10',
          )}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((columnIndex) => {
          const score = columnScores?.[columnIndex];
          const mine = score?.playerScores?.[currentPlayerId] ?? 0;
          const theirs = theirId ? (score?.playerScores?.[theirId] ?? 0) : 0;
          const leader =
            score?.isTie || !score?.winnerId
              ? 'none'
              : score.winnerId === currentPlayerId
                ? 'me'
                : 'them';

          return (
            <div
              key={columnIndex}
              className={cn(
                'rounded-md border bg-surface-2 py-3 text-center',
                leader === 'me' && 'border-gold-400/45',
                leader === 'them' && 'border-danger/45',
                leader === 'none' && 'border-subtle',
              )}
            >
              <div className="type-micro text-ink-low">Col {columnIndex + 1}</div>
              <div className="mt-1.5 flex items-baseline justify-center gap-1 font-display text-lg font-bold tabular">
                <span className={leader === 'me' ? 'text-gold-300' : 'text-ink-mid'}>{mine}</span>
                <span className="text-[11px] font-normal text-ink-low">:</span>
                <span className={leader === 'them' ? 'text-danger' : 'text-ink-mid'}>{theirs}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        {Object.entries(players).map(([playerId, name]) => {
          const isMe = playerId === currentPlayerId;
          const won = columnsWon?.[playerId] ?? 0;
          return (
            <div
              key={playerId}
              className="flex items-center justify-between rounded-md border border-subtle bg-surface-2 px-4 py-2.5 text-sm"
            >
              <span className={isMe ? 'text-gold-300' : 'text-ink-mid'}>
                {name}
                {isMe && <span className="ml-1.5 text-ink-low">(you)</span>}
              </span>
              <span className="tabular text-ink-hi">
                {won} column{won === 1 ? '' : 's'}
              </span>
            </div>
          );
        })}
      </div>

      <Button variant="secondary" size="lg" className="mt-6 w-full" onClick={onReturn}>
        Return to Menu
      </Button>
    </Modal>
  );
}
