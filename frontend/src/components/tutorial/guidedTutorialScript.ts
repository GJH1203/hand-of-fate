/**
 * The script the guided tutorial plays out: a scripted duel, step by step.
 *
 * Data, not behaviour — kept apart from the component so that changing what the
 * tutorial teaches does not mean reading three hundred lines of board literals to
 * find the sentence you meant to edit.
 *
 * The cards and the opening are the ones the server actually deals, read out of
 * DeckInitializationService and GameService: two Sparks (1), two Lightnings (3),
 * one Thunder (5), and one random card from each hand placed on the middle column
 * before the first turn. It used to invent five card names that exist nowhere in
 * the game, so the first real duel looked unfamiliar.
 */

export type Side = 'you' | 'opponent';

export interface SimCard {
  id: string;
  name: string;
  power: number;
  owner: Side;
}

export type Cell = SimCard | null;
export type Grid = Cell[][];

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

export function columnTotals(grid: Grid) {
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

export type ActionKind = 'continue' | 'place' | 'pass' | 'request-win' | 'complete';

export interface Step {
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

export const STEPS: Step[] = [
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
      'They answered your Thunder with a Spark of their own in column 3. Column 1 is still untouched — put a Spark there and stake a claim before they do.',
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
