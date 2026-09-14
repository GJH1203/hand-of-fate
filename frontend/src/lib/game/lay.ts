/**
 * Laid by hand.
 *
 * A card put down on a table is never square to the grid. Every placed card
 * carries a fraction of a degree of rotation and a pixel or so of offset, so a
 * finished board looks laid rather than snapped.
 *
 * It is DERIVED from the card's position, not random, and that is the whole
 * trick: `Math.random()` would produce one value during the server render and a
 * different one on the client, React would find a mismatched `style` attribute
 * and tear the tree down over it. A pure function of (x, y) gives the same
 * answer in both places, forever, and gives the same card the same lie every
 * time you look at it — which is what makes it read as a physical fact about
 * that card rather than as an animation.
 *
 * The constants are two of Knuth's multiplicative hash primes; there is nothing
 * clever about the choice beyond their being co-prime and large.
 */

const MAX_ROTATION_DEG = 0.8;
const MAX_OFFSET_PX = 1.5;

function unit(seed: number, shift: number): number {
  // >>> 0 first: the XOR above can produce a negative int32, and % on a
  // negative gives a negative, which would bias every card one way.
  const h = ((seed >>> shift) >>> 0) % 1000;
  return h / 1000;
}

export type LayStyle = {
  '--lay-rot': string;
  '--lay-x': string;
  '--lay-y': string;
};

/** CSS custom properties for a card at (x, y). Pair with the `.laid` class. */
export function layStyle(x: number, y: number): LayStyle {
  const seed = (x * 73856093) ^ (y * 19349663);
  return {
    '--lay-rot': `${((unit(seed, 0) * 2 - 1) * MAX_ROTATION_DEG).toFixed(3)}deg`,
    '--lay-x': `${((unit(seed, 9) * 2 - 1) * MAX_OFFSET_PX).toFixed(2)}px`,
    '--lay-y': `${((unit(seed, 18) * 2 - 1) * MAX_OFFSET_PX).toFixed(2)}px`,
  };
}
