import { describe, expect, it } from 'vitest';

import { cardsByPosition, learnArt, legalPlacements } from './board';
import type { Card, GameState } from '@/types/game';

const ME = 'me';
const THEM = 'them';

const keysOf = (moves: { x: number; y: number }[]) =>
  moves.map((m) => `${m.x},${m.y}`).sort();

describe('legalPlacements', () => {
  it('opens the whole board when nothing has been played', () => {
    expect(legalPlacements({}, {}, ME)).toHaveLength(15);
  });

  it('offers the four squares around your own card', () => {
    const moves = legalPlacements({ '1,2': 'a' }, { '1,2': ME }, ME);
    expect(keysOf(moves)).toEqual(['0,2', '1,1', '1,3', '2,2']);
  });

  it('ignores the opponent\'s cards', () => {
    const moves = legalPlacements({ '1,2': 'a' }, { '1,2': THEM }, ME);
    expect(moves).toEqual([]);
  });

  it('stays on the board at the edges', () => {
    const moves = legalPlacements({ '0,0': 'a' }, { '0,0': ME }, ME);
    expect(keysOf(moves)).toEqual(['0,1', '1,0']);
  });

  it('never offers an occupied square, or the same square twice', () => {
    // Two of your cards side by side: the squares between and around them are
    // reachable from both, and must be offered once.
    const pieces = { '1,1': 'a', '1,2': 'b' };
    const owned = { '1,1': ME, '1,2': ME };
    const moves = legalPlacements(pieces, owned, ME);

    expect(keysOf(moves)).toEqual(['0,1', '0,2', '1,0', '1,3', '2,1', '2,2']);
    expect(new Set(keysOf(moves)).size).toBe(moves.length);
  });
});

describe('learnArt', () => {
  it('remembers art by card name and leaves the rest alone', () => {
    const art = learnArt({}, [
      { id: '1', power: 3, name: 'Lightning', imageUrl: '/gifs/lightning.png' },
      { id: '2', power: 1, name: 'Spark' },
      undefined,
    ]);
    expect(art).toEqual({ Lightning: '/gifs/lightning.png' });
  });
});

describe('cardsByPosition', () => {
  const state = (pieces: Record<string, string>, placed: Record<string, Card>) =>
    ({ board: { width: 3, height: 5, pieces }, placedCards: placed }) as unknown as GameState;

  it('puts back art the server did not send, by name', () => {
    const cards = cardsByPosition(
      state({ '1,1': 'x' }, { x: { id: 'x', power: 3, name: 'Lightning' } }),
      { Lightning: '/gifs/lightning.png' },
    );
    expect(cards['1,1'].imageUrl).toBe('/gifs/lightning.png');
  });

  it('keeps art the server did send', () => {
    const cards = cardsByPosition(
      state({ '1,1': 'x' }, { x: { id: 'x', power: 3, name: 'Lightning', imageUrl: '/real.png' } }),
      { Lightning: '/wrong.png' },
    );
    expect(cards['1,1'].imageUrl).toBe('/real.png');
  });

  it('still shows a card the server described only by id', () => {
    const cards = cardsByPosition(state({ '0,0': 'ghost' }, {}), {});
    expect(cards['0,0']).toMatchObject({ id: 'ghost', name: 'Card', power: 1 });
  });
});
