import { describe, expect, it } from 'vitest';

import { describeNewMoves, outcomeFor, readableState, roomCodeOf } from './matchView';
import type { GameState } from '@/types/game';

const ME = 'me';
const THEM = 'them';

describe('readableState', () => {
  it('never shows a database value', () => {
    expect(readableState('IN_PROGRESS').label).toBe('In Progress');
    expect(readableState('COMPLETED').label).toBe('Finished');
    expect(readableState('INITIALIZED').label).toBe('Waiting');
  });
});

describe('outcomeFor', () => {
  const state = (over: Partial<GameState>) => over as GameState;

  it('reads a tie as a tie for both sides', () => {
    expect(outcomeFor(state({ isTie: true, winnerId: null }), ME)).toBe('tie');
    expect(outcomeFor(state({ isTie: true, winnerId: null }), THEM)).toBe('tie');
  });

  it('is a win only for the winner', () => {
    expect(outcomeFor(state({ winnerId: ME }), ME)).toBe('win');
    expect(outcomeFor(state({ winnerId: ME }), THEM)).toBe('loss');
  });
});

describe('roomCodeOf', () => {
  it('is the last six characters, upper case', () => {
    expect(roomCodeOf('nakama_4f58ca')).toBe('4F58CA');
  });
});

describe('describeNewMoves', () => {
  const state = (
    pieces: Record<string, string>,
    ownership: Record<string, string>,
  ): GameState =>
    ({
      board: { width: 3, height: 5, pieces },
      cardOwnership: ownership,
      placedCards: {
        a: { id: 'a', power: 3, name: 'Lightning' },
        b: { id: 'b', power: 5, name: 'Thunder' },
      },
      playerNames: { [ME]: 'Ransicat', [THEM]: 'Ransirat' },
    }) as unknown as GameState;

  it('says nothing about the board it saw first', () => {
    // A client that reconnects mid-duel has no baseline, and must not narrate
    // moves it never watched happen.
    expect(describeNewMoves(null, state({ '1,1': 'a' }, { '1,1': ME }), ME)).toEqual([]);
  });

  it('names the column, the card and its power', () => {
    const lines = describeNewMoves({}, state({ '1,1': 'a' }, { '1,1': ME }), ME);
    expect(lines).toEqual(['You placed Lightning (3) → Col 2']);
  });

  it('calls the opponent by name', () => {
    const lines = describeNewMoves({}, state({ '2,0': 'b' }, { '2,0': THEM }), ME);
    expect(lines).toEqual(['Ransirat placed Thunder (5) → Col 3']);
  });

  it('reports only what is new, newest first', () => {
    const before = { '0,0': 'a' };
    const after = state(
      { '0,0': 'a', '1,1': 'a', '2,2': 'b' },
      { '0,0': ME, '1,1': ME, '2,2': THEM },
    );
    expect(describeNewMoves(before, after, ME)).toEqual([
      'Ransirat placed Thunder (5) → Col 3',
      'You placed Lightning (3) → Col 2',
    ]);
  });

  it('falls back rather than crashing on a card it was not sent', () => {
    const lines = describeNewMoves({}, state({ '0,3': 'unknown' }, { '0,3': THEM }), ME);
    expect(lines).toEqual(['Ransirat placed a card → Col 1']);
  });
});
