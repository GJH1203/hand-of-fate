import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * A status chip is a stamp: a ruled box, mono caps, no fill, no radius, no dot of
 * semantic colour standing in for a word.
 *
 * THE TONE NAMES ARE KEPT FOR COMPATIBILITY AND MOST OF THEM NO LONGER NAME A
 * COLOUR. This design has no semantic quartet — there is no green, no info blue and
 * no danger red, because the Bootstrap four were inherited furniture and one of them
 * (crimson) was doing double duty as "the opponent" and "something went wrong" on
 * the same screen. What is left is: the two plates, which mean whose side something
 * is on, and the key plate, which means everything else. So `neutral`, `info` and
 * `success` are all the plain ink stamp and differ in nothing; `warning` is ruled in
 * ochre, which is a rule colour and never a text colour, so its letters stay ink.
 * Renaming the props would break call sites in five other units for no gain.
 */
const badgeVariants = cva("stamp whitespace-nowrap", {
  variants: {
    tone: {
      /* The key plate. Three names, one stamp, and that is the point. */
      neutral: "text-ink",
      info: "text-ink",
      success: "text-ink",
      /* Attention, ruled in ochre. Ochre is 3.59:1 and may never letter anything. */
      warning: "border-ochre text-ink",
      /* A failure, lettered deep enough to clear AA at 10px. */
      danger: "border-verm-deep text-verm-deep",
      /* Your side of the duel — plate one. */
      ember: "stamp--mine",
      /* Their side of the duel — plate two. */
      steel: "stamp--theirs",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

/*
 * The dot is a square. Every rounded corner in this system is zero, and at 6px a
 * square of ink reads as a printer's mark where a circle reads as a bullet.
 */
const dotColors: Record<string, string> = {
  neutral: "bg-ink",
  info: "bg-ink",
  success: "bg-ink",
  warning: "bg-ochre",
  danger: "bg-verm-deep",
  ember: "bg-verm",
  steel: "bg-prus",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading 6px mark in the tone colour. */
  dot?: boolean;
}

function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0", dotColors[tone ?? "neutral"])} />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
