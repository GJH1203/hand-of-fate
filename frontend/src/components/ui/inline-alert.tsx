import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "danger" | "success" | "warning" | "info";

/**
 * The in-panel message strip, set as a rubric: a ruled box with a heavy cinnabar bar
 * down the leading edge, which is how a correction has been marked for a thousand
 * years before anybody had a colour to spare on it.
 *
 * ALL FOUR TONES LOOK THE SAME ON PURPOSE, and the prop is kept only so the units
 * that pass it still compile. There is no semantic colour quartet here — no green,
 * no info blue, no danger red — because red in this system is rubrication and
 * nothing else: an index, not an emotion. It marks the place you are meant to look.
 * A message that needs to be found is found by the bar and the box; what it actually
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
        "rubric text-[15px] leading-[1.55] text-parchment",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
