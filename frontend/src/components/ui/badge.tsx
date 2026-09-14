import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * One badge, six tones, one colour formula: the semantic colour for the text, the
 * same colour at 10% behind it, the same colour at 22% around it.
 *
 * Square-ish rather than a pill. Every status chip on the internet is a fully
 * rounded capsule, and this application has one on nearly every row — a 4px corner
 * costs nothing and stops the arena top bar looking like a row of cough sweets. The
 * text is small caps instead of shouted uppercase, which keeps the same compactness
 * without the ransom-note texture.
 */
const badgeVariants = cva(
  "inline-flex h-[22px] items-center gap-1.5 rounded-xs border px-2 font-ui text-[12px] font-medium leading-none tracking-[0.06em] whitespace-nowrap [font-variant-caps:all-small-caps]",
  {
    variants: {
      tone: {
        neutral: "border-white/12 bg-white/[0.05] text-ink-mid",
        success: "border-success/22 bg-success/10 text-success",
        warning: "border-warning/22 bg-warning/10 text-warning",
        danger: "border-danger/22 bg-danger/10 text-danger",
        info: "border-info/22 bg-info/10 text-info",
        /* Your side of the duel. */
        ember: "border-ember-400/25 bg-ember-400/10 text-ember-300",
        /* Their side of the duel. */
        steel: "border-steel-400/25 bg-steel-400/10 text-steel-300",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

const dotColors: Record<string, string> = {
  neutral: "bg-ink-low",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  ember: "bg-ember-400",
  steel: "bg-steel-400",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading 6px dot in the tone colour. */
  dot?: boolean;
}

function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColors[tone ?? "neutral"])} />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
