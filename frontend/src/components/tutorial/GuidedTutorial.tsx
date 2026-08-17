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

/*
 * The guided tutorial: a scripted game you actually play, one instruction at a time.
 *
 * The card names and powers are the real deck — two Sparks (1), two Lightnings (3),
 * one Thunder (5) — and the opening matches what the server does: one random card
 * from each hand is placed before the first turn, leaving four in hand. It used to
 * invent five card names that exist nowhere in the game, which meant the first real
 * duel looked nothing like the training.
 */

type Side = 'you' | 'opponent';

interface SimCard {
  id: string;
  name: string;
  power: number;
  owner: Side;
}

type Cell = SimCard | null;
type Grid = Cell[][];

const ROWS = 5;
const COLS = 3;

const yourDeck: SimCard[] = [
  { id: 'you-spark-a', name: 'Spark', power: 1, owner: 'you' },
  { id: 'you-spark-b', name: 'Spark', power: 1, owner: 'you' },
  { id: 'you-lightning-a', name: 'Lightning', power: 3, owner: 'you' },
  { id: 'you-lightning-b', name: 'Lightning', power: 3, owner: 'you' },
  { id: 'you-thunder', name: 'Thunder', power: 5, owner: 'you' },
];

const emptyGrid = (): Grid => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));

/** Builds a board from a list of placements, so no step repeats a grid literal. */
const gridWith = (...placements: [number, number, SimCard][]): Grid => {
  const grid = emptyGrid();
  placements.forEach(([row, col, card]) => {
    grid[row][col] = card;
  });
  return grid;
};

const theirs = (id: string, name: string, power: number): SimCard => ({
  id,
  name,
  power,
  owner: 'opponent',
});

// Their five cards, in the order the script plays them.
const THEIR_OPENING = theirs('opp-spark-a', 'Spark', 1);
const THEIR_SECOND = theirs('opp-lightning-a', 'Lightning', 3);
const THEIR_THIRD = theirs('opp-spark-b', 'Spark', 1);
const THEIR_FOURTH = theirs('opp-lightning-b', 'Lightning', 3);
const THEIR_FIFTH = theirs('opp-thunder', 'Thunder', 5);

const YOUR_OPENING = yourDeck[2]; // Lightning, taken by fate before the first turn

const P = {
  yourOpening: [1, 1, YOUR_OPENING] as [number, number, SimCard],
  theirOpening: [3, 1, THEIR_OPENING] as [number, number, SimCard],
  yourSecond: [2, 1, yourDeck[3]] as [number, number, SimCard],
  theirSecond: [4, 1, THEIR_SECOND] as [number, number, SimCard],
  yourThunder: [1, 2, yourDeck[4]] as [number, number, SimCard],
  theirThird: [3, 2, THEIR_THIRD] as [number, number, SimCard],
  yourSparkA: [1, 0, yourDeck[0]] as [number, number, SimCard],
  theirFourth: [3, 0, THEIR_FOURTH] as [number, number, SimCard],
  theirFifth: [4, 0, THEIR_FIFTH] as [number, number, SimCard],
  yourSparkB: [2, 0, yourDeck[1]] as [number, number, SimCard],
};

const handAfter = (...played: string[]): SimCard[] =>
  yourDeck.filter((card) => card.id !== YOUR_OPENING.id && !played.includes(card.id));

function columnTotals(grid: Grid) {
  return [0, 1, 2].map((col) => {
    let mine = 0;
    let opponent = 0;
    for (let row = 0; row < ROWS; row += 1) {
      const card = grid[row][col];
      if (!card) continue;
      if (card.owner === 'you') mine += card.power;
      else opponent += card.power;
    }
    const leader = mine > opponent ? 'you' : opponent > mine ? 'opponent' : null;
    return { col, mine, opponent, leader };
  });
}

type ActionKind = 'continue' | 'place' | 'pass' | 'request-win' | 'complete';

interface Step {
  id: string;
  title: string;
  subtitle: string;
  instruction: string;
  tip: string;
  grid: Grid;
  hand: SimCard[];
  actions: ActionKind[];
  /** The card the player must pick, and where it goes. */
  expect?: { cardId: string; cell: string };
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Arena',
    subtitle: 'Meet your guide',
    instruction:
      'Greetings, apprentice. I am the Arcane Master, and I will walk you through a single duel from beginning to end.',
    tip: 'Press Continue to begin your training.',
    grid: emptyGrid(),
    hand: yourDeck,
    actions: ['continue'],
  },
  {
    id: 'board',
    title: 'Understanding the Battlefield',
    subtitle: 'Three columns, five rows',
    instruction:
      'This is the board: three columns wide and five rows tall. Neither side owns a half of it — every square is contested.',
    tip: 'Each column is its own battle. Win more columns than your opponent and the duel is yours.',
    grid: emptyGrid(),
    hand: yourDeck,
    actions: ['continue'],
  },
  {
    id: 'setup',
    title: 'The Ritual of Beginning',
    subtitle: 'Fate deals the first blow',
    instruction:
      'Before anyone moves, fate takes one card at random from each hand and places it on the board. Yours was the Lightning; theirs was a Spark.',
    tip: 'You begin your first turn with four cards, not five. Which one fate takes is never yours to choose.',
    grid: gridWith(P.yourOpening, P.theirOpening),
    hand: handAfter(),
    actions: ['continue'],
  },
  {
    id: 'first-placement',
    title: 'Your First Move',
    subtitle: 'Place beside your own card',
    instruction:
      'A card may only be placed next to a card you already own. Take your second Lightning and set it below the first to build column 2.',
    tip: 'Pick the Lightning on the right, then click the glowing square.',
    grid: gridWith(P.yourOpening, P.theirOpening),
    hand: handAfter(),
    actions: ['place'],
    expect: { cardId: 'you-lightning-b', cell: '2,1' },
  },
  {
    id: 'opponent-response',
    title: 'Your Opponent Answers',
    subtitle: 'Watch the reply',
    instruction: 'They add a Lightning of their own to the same column, and the count moves.',
    tip: 'Column 2 now stands at 6 to 4 in your favour.',
    grid: gridWith(P.yourOpening, P.theirOpening, P.yourSecond, P.theirSecond),
    hand: handAfter('you-lightning-b'),
    actions: ['continue'],
  },
  {
    id: 'expand',
    title: 'Claiming New Ground',
    subtitle: 'Spend the Thunder well',
    instruction:
      'Column 3 is empty and nobody has claimed it. Place your Thunder beside your first Lightning and take it outright.',
    tip: 'A five in an empty column is a column won until they can answer it.',
    grid: gridWith(P.yourOpening, P.theirOpening, P.yourSecond, P.theirSecond),
    hand: handAfter('you-lightning-b'),
    actions: ['place'],
    expect: { cardId: 'you-thunder', cell: '1,2' },
  },
  {
    id: 'scoring',
    title: 'How a Column is Won',
    subtitle: 'Add up the power',
    instruction:
      'Add the power of your cards in a column. The higher total controls it. An equal total controls it for nobody.',
    tip: 'You hold column 2 at 6 to 4 and column 3 at 5 to nothing.',
    grid: gridWith(P.yourOpening, P.theirOpening, P.yourSecond, P.theirSecond, P.yourThunder),
    hand: handAfter('you-lightning-b', 'you-thunder'),
    actions: ['continue'],
  },
  {
    id: 'contest',
    title: 'Contesting the Last Column',
    subtitle: 'Even a one has a job',
    instruction:
      'They answered your Thunder with a Spark, and they are ahead in column 1. Put a Spark in there to keep the column alive.',
    tip: 'Placing next to your own card is also how you deny them room to expand.',
    grid: gridWith(
      P.yourOpening,
      P.theirOpening,
      P.yourSecond,
      P.theirSecond,
      P.yourThunder,
      P.theirThird,
    ),
    hand: handAfter('you-lightning-b', 'you-thunder'),
    actions: ['place'],
    expect: { cardId: 'you-spark-a', cell: '1,0' },
  },
  {
    id: 'passing',
    title: 'The Art of Passing',
    subtitle: 'Doing nothing, deliberately',
    instruction:
      'Sometimes no move is the best move. Passing keeps a card in hand for a turn when it will decide a column.',
    tip: 'Press Pass Turn to try it.',
    grid: gridWith(
      P.yourOpening,
      P.theirOpening,
      P.yourSecond,
      P.theirSecond,
      P.yourThunder,
      P.theirThird,
      P.yourSparkA,
      P.theirFourth,
    ),
    hand: handAfter('you-lightning-b', 'you-thunder', 'you-spark-a'),
    actions: ['pass', 'place'],
  },
  {
    id: 'request-win',
    title: 'Ending It Early',
    subtitle: 'Ask to count the columns',
    instruction:
      'When you are confident of the count, you may ask to stop and score the board as it stands. Your opponent has to agree.',
    tip: 'You hold two of the three columns. Ask for the early end.',
    grid: gridWith(
      P.yourOpening,
      P.theirOpening,
      P.yourSecond,
      P.theirSecond,
      P.yourThunder,
      P.theirThird,
      P.yourSparkA,
      P.theirFourth,
      P.theirFifth,
    ),
    hand: handAfter('you-lightning-b', 'you-thunder', 'you-spark-a'),
    actions: ['request-win', 'pass', 'place'],
  },
  {
    id: 'win-response',
    title: 'They Refuse',
    subtitle: 'The duel continues',
    instruction:
      'Your opponent declined, so play goes on. A refusal costs you nothing but the turn it took to ask.',
    tip: 'Finish the board instead — one card left.',
    grid: gridWith(
      P.yourOpening,
      P.theirOpening,
      P.yourSecond,
      P.theirSecond,
      P.yourThunder,
      P.theirThird,
      P.yourSparkA,
      P.theirFourth,
      P.theirFifth,
    ),
    hand: handAfter('you-lightning-b', 'you-thunder', 'you-spark-a'),
    actions: ['continue'],
  },
  {
    id: 'final-move',
    title: 'The Last Card',
    subtitle: 'Close it out',
    instruction: 'Place your final Spark beneath the one you already own and complete your training.',
    tip: 'Column 1 is theirs, but columns 2 and 3 are yours — and two is enough.',
    grid: gridWith(
      P.yourOpening,
      P.theirOpening,
      P.yourSecond,
      P.theirSecond,
      P.yourThunder,
      P.theirThird,
      P.yourSparkA,
      P.theirFourth,
      P.theirFifth,
    ),
    hand: handAfter('you-lightning-b', 'you-thunder', 'you-spark-a'),
    actions: ['place'],
    expect: { cardId: 'you-spark-b', cell: '2,0' },
  },
  {
    id: 'complete',
    title: 'Mastery Achieved',
    subtitle: 'You are ready',
    instruction:
      'Two columns to one. You now know everything the game asks of you — the rest is judgement.',
    tip: 'Go and win a real duel.',
    grid: gridWith(
      P.yourOpening,
      P.theirOpening,
      P.yourSecond,
      P.theirSecond,
      P.yourThunder,
      P.theirThird,
      P.yourSparkA,
      P.theirFourth,
      P.theirFifth,
      P.yourSparkB,
    ),
    hand: [],
    actions: ['complete'],
  },
];

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
