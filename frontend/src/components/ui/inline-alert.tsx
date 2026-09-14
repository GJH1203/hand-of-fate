import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "danger" | "success" | "warning" | "info";

/**
 * The in-card message strip, now an errata slip: a ruled box with an ochre bar down
 * the leading edge, which is how a correction has been set for four hundred years.
 *
 * ALL FOUR TONES LOOK THE SAME ON PURPOSE, and the prop is kept only so the five
 * other units that pass it still compile. There is no semantic colour quartet here —
 * no green, no info blue, no danger red — because the old red was simultaneously the
 * opponent's colour and the failure colour, and no amount of care stops a reader
 * conflating those when they appear on one screen. A message that needs to be found
 * is found by the ochre rule and the heavy box, not by its hue; what it actually
 * says is carried by the words, which is where it belonged.
 *
 * `role` is the one thing the tone still changes, and it is the one that matters:
 * `alert` interrupts a screen reader, `status` waits its turn.
 */
interface InlineAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  children: React.ReactNode;
}

export function InlineAlert({ tone = "danger", className, children, ...props }: InlineAlertProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        // No icon. The bar down the edge is the mark, and a glyph beside it would be
        // the second thing saying "look here" before the sentence has said anything.
        "errata font-mono text-[12px] leading-[1.5] text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
