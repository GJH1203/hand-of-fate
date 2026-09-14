/*
 * The firmament.
 *
 * A night sky, and the argument for every part of it is that a flat dark fill is
 * not a sky — it is an absence. So: an indigo ground rather than a black one,
 * because a true black night is a printing failure; a milky band of two very
 * wide, very faint pools so the sky has a brighter quarter and a deeper one; a
 * handful of real stars; and a vignette weighted so the centre of the screen is
 * where the light is.
 *
 * The stars are DRAWN, and there are twelve of them.
 *
 * An earlier version of this file scattered thirty-four dots evenly across the
 * viewport and the note in it eventually admitted they read as sesame rather
 * than as a sky. The problem was not the count, it was that a dot is not a star:
 * a star in every celestial chart ever engraved is a four-pointed figure with
 * rays, sized by its magnitude. Twelve drawn stars at three magnitudes, placed
 * off any grid, read as a sky. Thirty-four dots read as dust on the screen.
 *
 * The positions are written out rather than generated: Math.random() differs
 * between the server render and the client one, and React will pull the tree
 * down over a style attribute that does not match.
 */

type Star = { x: number; y: number; r: number; o: number };

/* Clustered, not spread — three loose groups and a few strays, the way a sky is. */
const STARS: Star[] = [
  { x: 11, y: 17, r: 7, o: 0.5 },
  { x: 17, y: 28, r: 4, o: 0.32 },
  { x: 8, y: 36, r: 10, o: 0.62 },
  { x: 24, y: 12, r: 4, o: 0.26 },
  { x: 38, y: 63, r: 5, o: 0.3 },
  { x: 47, y: 8, r: 8, o: 0.42 },
  { x: 61, y: 21, r: 4, o: 0.24 },
  { x: 72, y: 14, r: 11, o: 0.55 },
  { x: 79, y: 31, r: 5, o: 0.3 },
  { x: 88, y: 22, r: 7, o: 0.38 },
  { x: 84, y: 71, r: 6, o: 0.34 },
  { x: 93, y: 58, r: 4, o: 0.22 },
];

/** A four-pointed star with rays — the mark every engraved chart uses. */
function StarGlyph({ x, y, r, o }: Star) {
  return (
    <svg
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, opacity: o }}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        d="M12 0L13.1 10.9L24 12L13.1 13.1L12 24L10.9 13.1L0 12L10.9 10.9Z"
        fill="#F5E3AE"
      />
    </svg>
  );
}

export default function AppBackground() {
  return (
    <div aria-hidden className="firmament">
      <div className="firmament__wash" />
      {STARS.map((s, i) => (
        <StarGlyph key={i} {...s} />
      ))}
      <div className="firmament__vignette" />
    </div>
  );
}
