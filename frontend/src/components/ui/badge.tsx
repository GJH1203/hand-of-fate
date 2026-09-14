import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { OwnerMark } from "@/components/game/Pips";
import { cn } from "@/lib/utils";

/*
 * A status chip is a cartouche: the small ruled enclosure a name or a state is set
 * in, lettered in Roman capitals, with no fill and no radius.
 *
 * THE TONE NAMES ARE KEPT FOR COMPATIBILITY AND MOST OF THEM NO LONGER NAME A
 * COLOUR. This design has no semantic quartet — no green, no info blue, no danger
 * red — because the Bootstrap four were inherited furniture and one of them was
 * doing double duty as "the opponent" and "something went wrong" on the same screen.
 * What is left is the two metals, which say whose side something is on, and the
 * plain cartouche, which says everything else. So `neutral`, `info` and `success`
 * are one stamp and differ in nothing; `warning` is ruled in cinnabar and keeps
 * parchment letters, because a rubric is an index rather than an emotion and the
 * rule is enough of an index on its own. Renaming the props would break call sites
 * in five other units for no gain.
 */
const badgeVariants = cva("cartouche whitespace-nowrap", {
  variants: {
    tone: {
      /* The plain cartouche. Three names, one enclosure, and that is the point. */
      neutral: "",
      info: "",
      success: "",
      /* Attention, ruled in cinnabar. The letters stay parchment. */
      warning: "border-cinnabar",
      /* A failure: ruled and lettered in cinnabar, which is the only thing in this
         system permitted to be red. */
      danger: "border-cinnabar text-cinnabar",
      /* Sol — your side of the duel. */
      ember: "cartouche--sol",
      /* Luna — theirs. */
      steel: "cartouche--luna",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

/*
 * The leading mark.
 *
 * For the two sides of the duel it is the OWNER'S FIGURE — a rayed disc for Sol, a
 * crescent for Luna — and not a coloured dot, because gold against silver measures
 * about 1.25:1 and a dot of it carries nothing. Ownership is a shape first and a
 * metal last, everywhere it is expressed, and a badge saying whose turn it is has
 * to obey that or it contradicts the board it sits beside.
 *
 * Everything else gets a square. Every corner in this system is zero, and at 6px a
 * square reads as a mark where a circle reads as a bullet.
 */
const dotColors: Record<string, string> = {
  neutral: "bg-parchment-2",
  info: "bg-parchment-2",
  success: "bg-parchment-2",
  warning: "bg-cinnabar",
  danger: "bg-cinnabar",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading 6px mark in the tone colour. */
  dot?: boolean;
}

function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  const key = tone ?? "neutral";
  const owned = key === "ember" || key === "steel";

  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot &&
        (owned ? (
          /* currentColor, so the figure takes the metal the cartouche is already
             lettered in rather than naming it a second time. */
          <OwnerMark mine={key === "ember"} className="h-3 w-3 shrink-0" />
        ) : (
          <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0", dotColors[key])} />
        ))}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
