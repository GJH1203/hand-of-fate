import { cn } from "@/lib/utils";

/**
 * The only busy indicator, and it is deliberately not Lucide's `Loader2`.
 *
 * A drawn arc says "working" at 14px as well as the stock icon does, costs no icon
 * import, and — because the arc is `currentColor` — it inherits the colour of
 * whatever it sits in without a second class.
 *
 * Two changes for paper. The track is a real ink (`--rule-min`, the 3:1 floor)
 * rather than the same colour at 20% opacity, because hierarchy here is carried by
 * weight and density and never by transparency. And the cap is flat: a rule drawn
 * on a press ends where it ends, it does not round off.
 *
 * It rotates forever, which is the one thing rule 7 allows a loop to do — the
 * honest answer while it is on screen is "we are still waiting".
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
      {/* A class, not stroke="var(--rule-min)": var() in a presentation attribute
          is patchily supported and fails silently to no stroke at all. */}
      <circle cx="12" cy="12" r="9" className="stroke-rule-min" strokeWidth="2" />
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
 * The old shimmer was a white gradient swept across a dark block, which on paper
 * would be a highlight travelling over a sheet — light where there is no light
 * source. It is replaced by `ink-pulse`, the single looping keyframe in globals.css,
 * on a paper-deep block: the stock is simply not printed yet. Paper-deep is the fill
 * that may never carry text, which is exactly right for a placeholder that has none.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block bg-paper-deep animate-[ink-pulse_1.6s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}
