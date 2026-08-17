import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * One badge, six tones, one colour formula: the semantic colour for the text, the
 * same colour at 12% behind it, the same colour at 25% around it. Every status
 * pill in the application is this component — there is nothing else to reach for.
 */
const badgeVariants = cva(
  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-ui text-[11px] font-semibold uppercase leading-none tracking-[0.06em] whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-white/15 bg-white/[0.06] text-ink-mid",
        success: "border-success/25 bg-success/[0.12] text-success",
        warning: "border-warning/25 bg-warning/[0.12] text-warning",
        danger: "border-danger/25 bg-danger/[0.12] text-danger",
        info: "border-info/25 bg-info/[0.12] text-info",
        gold: "border-gold-400/25 bg-gold-400/[0.12] text-gold-300",
        arcane: "border-arcane-400/25 bg-arcane-400/[0.12] text-arcane-300",
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
  gold: "bg-gold-400",
  arcane: "bg-arcane-400",
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
