'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Crown,
  Eye,
  Flag,
  Sparkles,
  SkipForward,
  Trophy,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  type ActionKind,
  type SimCard,
  type Step,
  STEPS,
  columnTotals,
} from './guidedTutorialScript';

/*
 * The guided tutorial: a scripted duel you actually play, one instruction at a time.
 *
 * What it teaches is in `guidedTutorialScript.ts`; this drives it. The split is the
 * point — the script is three hundred lines of board positions and sentences, and it
 * used to sit on top of the component that plays it.
 */

interface GuidedTutorialProps {
  playerName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedTutorial({ playerName, onComplete, onSkip }: GuidedTutorialProps) {
  const [index, setIndex] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, SimCard>>({});
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const step = STEPS[index];

  useEffect(() => {
    setMessage(step.instruction);
    setSelectedCardId(null);
    setPlaced({});
  }, [index, step.instruction]);

  // The scripted board plus whatever the player has just put down on this step.
  const grid = useMemo(() => {
    const next = step.grid.map((row) => [...row]);
    Object.entries(placed).forEach(([key, card]) => {
      const [row, col] = key.split(',').map(Number);
      next[row][col] = card;
    });
    return next;
  }, [step.grid, placed]);

  const hand = step.hand.filter((card) => !Object.values(placed).some((c) => c.id === card.id));
  const totals = columnTotals(grid);
  const columnsWon = totals.filter((t) => t.leader === 'you').length;
  const columnsLost = totals.filter((t) => t.leader === 'opponent').length;

  const advance = (delay = 1200) => {
    window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, STEPS.length - 1));
    }, delay);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!step.expect || selectedCardId !== step.expect.cardId) return;
    if (step.expect.cell !== `${row},${col}`) return;

    const card = hand.find((c) => c.id === selectedCardId);
    if (!card) return;

    setPlaced((current) => ({ ...current, [`${row},${col}`]: card }));
    setSelectedCardId(null);
    advance();
  };

  const handleAction = (action: ActionKind) => {
    if (action === 'complete') {
      onComplete();
      return;
    }
    if (action === 'pass') {
      setMessage('Wise. A card held back is a column you can still take.');
      advance(1400);
      return;
    }
    if (action === 'request-win') {
      setMessage('You have asked to end the duel early. They are considering…');
      setIsThinking(true);
      window.setTimeout(() => {
        setIsThinking(false);
        advance(200);
      }, 1800);
      return;
    }
    advance(400);
  };

  return (
    <div className="min-h-dvh px-6 py-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <Panel>
          <PanelHeader
            icon={Sparkles}
            title={step.title}
            subtitle={`Step ${index + 1} of ${STEPS.length} · ${step.subtitle}`}
            action={
              <Button variant="ghost" size="sm" onClick={onSkip}>
                <SkipForward size={16} strokeWidth={1.75} />
                Skip
              </Button>
            }
          />
          <div className="h-[3px] w-full bg-surface-3">
            <div
              className="h-full bg-gold-400 transition-[width] duration-200 ease-arcane"
              style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHeader icon={Eye} title="Battlefield" />
            <PanelBody>
              <div className="mx-auto w-fit">
                <div className="grid grid-cols-3 gap-2">
                  {totals.map((total) => (
                    <div
                      key={total.col}
                      className={cn(
                        'flex h-11 w-[72px] flex-col items-center justify-center rounded-md border bg-surface-1',
                        total.leader === 'you' && 'border-gold-400/45',
                        total.leader === 'opponent' && 'border-danger/45',
                        !total.leader && 'border-subtle',
                      )}
                    >
                      <span className="type-micro leading-none text-ink-low">Col {total.col + 1}</span>
                      <span className="mt-1 flex items-baseline gap-1 font-display text-base font-bold leading-none tabular">
                        <span className={total.leader === 'you' ? 'text-gold-300' : 'text-ink-mid'}>
                          {total.mine}
                        </span>
                        <span className="text-[11px] font-normal text-ink-low">:</span>
                        <span
                          className={total.leader === 'opponent' ? 'text-danger' : 'text-ink-mid'}
                        >
                          {total.opponent}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {grid.map((row, rowIndex) =>
                    row.map((card, colIndex) => {
                      const key = `${rowIndex},${colIndex}`;
                      const isTarget =
                        !!step.expect &&
                        step.expect.cell === key &&
                        selectedCardId === step.expect.cardId &&
                        !card;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          disabled={!isTarget}
                          aria-label={
                            card
                              ? `Column ${colIndex + 1}, row ${rowIndex + 1}: ${card.owner === 'you' ? 'your' : 'their'} ${card.name} ${card.power}`
                              : `Column ${colIndex + 1}, row ${rowIndex + 1}, empty`
                          }
                          className={cn(
                            'relative h-[72px] w-[72px] overflow-hidden rounded-md border border-subtle bg-surface-1',
                            'transition-[box-shadow,border-color] duration-150',
                            isTarget && 'cell-valid cursor-pointer border-arcane-400/40',
                          )}
                        >
                          {card && (
                            <div
                              className={cn(
                                'flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[7px] border bg-surface-0',
                                card.owner === 'you' ? 'border-gold-400/80' : 'border-danger/70',
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute left-1 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full font-display text-[13px] font-bold leading-none tabular',
                                  card.owner === 'you'
                                    ? 'bg-gold-400 text-[#1A1206]'
                                    : 'bg-danger text-white',
                                )}
                              >
                                {card.power}
                              </span>
                              <span className="mt-3 font-display text-[9px] uppercase tracking-[0.1em] text-ink-mid">
                                {card.name}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>
            </PanelBody>
          </Panel>

          <div className="space-y-5">
            <Panel style={{ borderColor: 'rgba(217,174,78,0.3)' }}>
              <PanelHeader icon={Sparkles} title="Arcane Master" />
              <PanelBody>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 ring-2 ring-gold-400/40">
                    {isThinking ? (
                      <Spinner size={16} className="text-gold-300" />
                    ) : (
                      <Sparkles size={18} strokeWidth={1.75} className="text-gold-300" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-ink-hi">{message}</p>
                    <p
                      className="type-small mt-3 rounded-md border px-3 py-2 text-gold-300"
                      style={{
                        borderColor: 'rgba(217,174,78,0.25)',
                        backgroundColor: 'rgba(217,174,78,0.08)',
                      }}
                    >
                      {step.tip}
                    </p>
                  </div>
                </div>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader icon={Users} title={`${playerName}'s Hand`} />
              <PanelBody className="p-4">
                {hand.length === 0 ? (
                  <p className="type-small text-ink-low">Your hand is empty.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {hand.map((card) => {
                      const wanted = step.expect?.cardId === card.id;
                      const selectable = step.actions.includes('place') && (!step.expect || wanted);
                      const selected = selectedCardId === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          disabled={!selectable}
                          onClick={() => setSelectedCardId(selected ? null : card.id)}
                          aria-pressed={selected}
                          className={cn(
                            'flex h-[104px] w-[74px] flex-col items-center justify-center rounded-md border bg-surface-0 transition-transform duration-200 ease-arcane',
                            selected
                              ? '-translate-y-2 border-gold-300 shadow-glow-gold'
                              : 'border-subtle',
                            selectable ? 'hover:-translate-y-1' : 'opacity-40',
                            wanted && !selected && 'border-arcane-400/60 glow-violet',
                          )}
                        >
                          <span className="font-display text-[9px] uppercase tracking-[0.12em] text-ink-mid">
                            {card.name}
                          </span>
                          <span className="mt-1 font-display text-2xl font-bold text-gold-300 tabular">
                            {card.power}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader icon={Activity} title="Standings" />
              <PanelBody className="flex items-center justify-between p-4 text-sm">
                <span className="flex items-center gap-2 text-ink-mid">
                  <Crown size={16} strokeWidth={1.75} className="text-gold-400" />
                  Columns held
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone="gold" className="tabular">
                    You {columnsWon}
                  </Badge>
                  <Badge tone="danger" className="tabular">
                    Them {columnsLost}
                  </Badge>
                </span>
              </PanelBody>
            </Panel>

            <div className="flex flex-wrap gap-2">
              {step.actions.includes('continue') && (
                <Button variant="primary" onClick={() => handleAction('continue')}>
                  Continue
                  <ArrowRight size={16} strokeWidth={1.75} />
                </Button>
              )}
              {step.actions.includes('pass') && (
                <Button variant="secondary" onClick={() => handleAction('pass')}>
                  <Flag size={16} strokeWidth={1.75} />
                  Pass Turn
                </Button>
              )}
              {step.actions.includes('request-win') && (
                <Button variant="ghost" onClick={() => handleAction('request-win')}>
                  <Trophy size={16} strokeWidth={1.75} />
                  Request Early End
                </Button>
              )}
              {step.actions.includes('complete') && (
                <Button variant="primary" onClick={() => handleAction('complete')}>
                  <Award size={16} strokeWidth={1.75} />
                  Finish Training
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
