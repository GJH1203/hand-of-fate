import type { GameState } from '@/types/game';

/** How many moves the battle log keeps. */
export const LOG_LENGTH = 6;

export type StateLabel = { label: string; tone: 'info' | 'neutral' | 'success' };

/** IN_PROGRESS is a database value. This is what a person should read. */
export function readableState(state: GameState['state']): StateLabel {
  switch (state) {
    case 'IN_PROGRESS':
      return { label: 'In Progress', tone: 'info' };
    case 'COMPLETED':
      return { label: 'Finished', tone: 'success' };
    default:
      return { label: 'Waiting', tone: 'neutral' };
  }
}

export type Outcome = 'win' | 'loss' | 'tie';

export function outcomeFor(state: GameState, playerId: string): Outcome {
  if (state.isTie) return 'tie';
  return state.winnerId === playerId ? 'win' : 'loss';
}

/** The six characters players share with each other. */
export const roomCodeOf = (matchId: string) => matchId.slice(-6).toUpperCase();

/**
 * Turns the difference between two server states into readable lines.
 *
 * There is no event stream on the server, so this is the only history there is —
 * and it is real: every line is a piece that appeared on the board while this
 * client was watching, not a guess about what might have happened. Newest first.
 */
export function describeNewMoves(
  before: Record<string, string> | null,
  state: GameState,
  viewerId: string,
): string[] {
  if (!before) return [];

  const after = state.board?.pieces ?? {};

  return Object.entries(after)
    .filter(([key]) => !(key in before))
    .map(([key, cardId]) => {
      const [x] = key.split(',').map(Number);
      const card = state.placedCards?.[cardId];
      const ownerId = state.cardOwnership?.[key];
      const owner =
        ownerId === viewerId ? 'You' : (ownerId && state.playerNames?.[ownerId]) || 'Opponent';
      const power = card ? ` (${card.power})` : '';
      return `${owner} placed ${card?.name ?? 'a card'}${power} → Col ${x + 1}`;
    })
    .reverse();
}
