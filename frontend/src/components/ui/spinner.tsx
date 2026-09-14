import { cn } from "@/lib/utils";

/**
 * The only busy indicator, and it is deliberately not Lucide's `Loader2`.
 *
 * A drawn arc says "working" at 14px as well as the stock icon does, costs no icon
 * import, and — because the arc is `currentColor` — it inherits the colour of
 * whatever it sits in without a second class.
 *
 * The track is a real ink, `gold-deep`, the recess a gilt rule falls to, rather than
 * the same gold at 20% opacity. Hierarchy here is carried by weight and value and
 * never by transparency: a gold rule at 30% is not a quieter gold rule, it is a grey
 * one. The cap stays flat, because a drawn line ends where it ends.
 *
 * It rotates forever, which is the one thing the motion rules allow a loop to do —
 * the honest answer while it is on screen is "we are still waiting".
 */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("animate-spin", className)}
    >
      {/* A class, not stroke="var(--gold-deep)": var() in a presentation attribute
          is patchily supported and fails silently to no stroke at all. */}
      <circle cx="12" cy="12" r="9" className="stroke-gold-deep" strokeWidth="2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * A block the shape of the thing that is loading.
 *
 * Used where a spinner would leave a hole the reader has to guess the size of — a
 * stat that is about to be a big number, a row that is about to be a list.
 *
 * It is a well cut into the night — `night-3`, the value reserved for wells, which
 * is exactly right for a placeholder that carries no text — and it breathes on
 * `ink-pulse`, the single looping keyframe in globals.css. The old shimmer was a
 * white gradient swept across the block, a highlight travelling over a surface with
 * no light source to cast it, which is the idiom this whole design is built against.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block bg-night-3 animate-[ink-pulse_1.6s_ease-in-out_infinite]", className)}
    />
  );
}
