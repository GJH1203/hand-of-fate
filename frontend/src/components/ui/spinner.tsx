import { cn } from "@/lib/utils";

/**
 * The only busy indicator, and it is deliberately not Lucide's `Loader2`.
 *
 * A drawn arc with a fading tail says "working" at 14px as well as the stock icon
 * does, costs no icon import, and — because the tail is `currentColor` at a lower
 * opacity — it inherits the colour of whatever it sits in without a second class.
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
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A block the shape of the thing that is loading.
 *
 * Used where a spinner would leave a hole the reader has to guess the size of — a
 * stat that is about to be a big number, a row that is about to be a list. The
 * shimmer is a translated gradient rather than an animated background-position, so
 * it stays on the compositor.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block overflow-hidden rounded-sm bg-white/[0.045]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/[0.07] after:to-transparent",
        className,
      )}
    />
  );
}
