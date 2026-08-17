/*
 * The one background every page sits on.
 *
 * Three layers: an ink-blue wash that is lighter at the top of the viewport, the
 * rune circle from the battle page at 5% as a texture, and a field of stars.
 *
 * The star positions are written out rather than generated. Math.random() would
 * differ between the server render and the client one, and — the reason the old
 * background looked like scattered sesame — an even spread does not read as a sky.
 * These are clustered, with three sizes and a range of brightness.
 */

type Star = {
  /** left, in % */ x: number;
  /** top, in % */ y: number;
  /** px */ size: number;
  opacity: number;
  /** the brightest few breathe */ twinkle?: boolean;
};

const STARS: Star[] = [
  { x: 4, y: 12, size: 1, opacity: 0.3 },
  { x: 7, y: 31, size: 2, opacity: 0.55 },
  { x: 9, y: 8, size: 1, opacity: 0.22 },
  { x: 13, y: 68, size: 1, opacity: 0.35 },
  { x: 15, y: 24, size: 3, opacity: 0.7, twinkle: true },
  { x: 17, y: 47, size: 1, opacity: 0.26 },
  { x: 21, y: 83, size: 2, opacity: 0.42 },
  { x: 23, y: 16, size: 1, opacity: 0.3 },
  { x: 26, y: 57, size: 1, opacity: 0.2 },
  { x: 29, y: 5, size: 2, opacity: 0.48 },
  { x: 31, y: 72, size: 1, opacity: 0.33 },
  { x: 34, y: 38, size: 1, opacity: 0.24 },
  { x: 37, y: 91, size: 2, opacity: 0.5 },
  { x: 41, y: 19, size: 1, opacity: 0.28 },
  { x: 44, y: 63, size: 3, opacity: 0.65, twinkle: true },
  { x: 46, y: 11, size: 1, opacity: 0.22 },
  { x: 49, y: 45, size: 1, opacity: 0.3 },
  { x: 53, y: 79, size: 2, opacity: 0.44 },
  { x: 56, y: 27, size: 1, opacity: 0.26 },
  { x: 58, y: 6, size: 1, opacity: 0.35 },
  { x: 62, y: 54, size: 2, opacity: 0.52 },
  { x: 64, y: 88, size: 1, opacity: 0.24 },
  { x: 67, y: 33, size: 1, opacity: 0.3 },
  { x: 71, y: 14, size: 3, opacity: 0.68, twinkle: true },
  { x: 73, y: 69, size: 1, opacity: 0.27 },
  { x: 76, y: 42, size: 2, opacity: 0.46 },
  { x: 79, y: 9, size: 1, opacity: 0.21 },
  { x: 82, y: 76, size: 1, opacity: 0.33 },
  { x: 85, y: 29, size: 2, opacity: 0.5 },
  { x: 88, y: 58, size: 1, opacity: 0.25 },
  { x: 91, y: 17, size: 1, opacity: 0.36 },
  { x: 93, y: 85, size: 2, opacity: 0.43 },
  { x: 95, y: 49, size: 1, opacity: 0.28 },
  { x: 97, y: 22, size: 1, opacity: 0.2 },
];

export default function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash, brightest at the top edge, falling away to near black */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #171B33 0%, #0A0C16 55%), #0A0C16",
        }}
      />

      {/* The rune circle, borrowed from the battle arena and pushed right back */}
      <div
        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.05]"
        style={{ backgroundImage: "url('/backgrounds/battle-arena.png')" }}
      />

      {/* Stars */}
      {STARS.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              "--star-opacity": star.opacity,
              animation: star.twinkle ? "star-twinkle 2s ease-in-out infinite" : undefined,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 45%, transparent 45%, rgba(4,5,12,0.55) 100%)",
        }}
      />
    </div>
  );
}
