import type { Card, GameState, Position } from '@/types/game';

/** The board is always three columns by five rows. The server agrees. */
export const BOARD_WIDTH = 3;
export const BOARD_HEIGHT = 5;

export const positionKey = (x: number, y: number) => `${x},${y}`;

/**
 * Where the given player may place a card.
 *
 * A card goes next to a card you already own — orthogonally, never diagonally —
 * and the very first card of a game may go anywhere, because there is nothing to
 * be next to yet. The server decides this too; this exists so the board can show
 * it before the round trip.
 */
export function legalPlacements(
  pieces: Record<string, string>,
  ownership: Record<string, string>,
  playerId: string,
): Position[] {
  if (Object.keys(pieces).length === 0) {
    return Array.from({ length: BOARD_HEIGHT }, (_, y) =>
      Array.from({ length: BOARD_WIDTH }, (_, x) => ({ x, y })),
    ).flat();
  }

  const seen = new Set<string>();
  const moves: Position[] = [];

  for (const key of Object.keys(pieces)) {
    if (ownership[key] !== playerId) continue;

    const [x, y] = key.split(',').map(Number);
    const neighbours = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const pos of neighbours) {
      const target = positionKey(pos.x, pos.y);
      const onBoard = pos.x >= 0 && pos.x < BOARD_WIDTH && pos.y >= 0 && pos.y < BOARD_HEIGHT;
      if (!onBoard || pieces[target] || seen.has(target)) continue;
      seen.add(target);
      moves.push(pos);
    }
  }

  return moves;
}

/** Card art by card name, learned from every card that arrives carrying it. */
export type ArtByName = Record<string, string>;

export function learnArt(known: ArtByName, cards: (Card | undefined)[]): ArtByName {
  const next = { ...known };
  for (const card of cards) {
    if (card?.name && card.imageUrl) next[card.name] = card.imageUrl;
  }
  return next;
}

/**
 * The cards on the board, by position, with their art put back.
 *
 * A card played over the socket used to come back from the server without its
 * `imageUrl` — the server rebuilt it from the action field by field. That is fixed
 * server-side, but games saved before the fix still hold cards with no picture, so
 * the name is used to restore one this client has already been sent.
 */
export function cardsByPosition(state: GameState, art: ArtByName): Record<string, Card> {
  const pieces = state.board?.pieces ?? {};
  const placed = state.placedCards ?? {};

  return Object.fromEntries(
    Object.entries(pieces).map(([key, cardId]) => {
      const card = placed[cardId] ?? { id: cardId, power: 1, name: 'Card' };
      return [key, card.imageUrl ? card : { ...card, imageUrl: art[card.name] }];
    }),
  );
}
