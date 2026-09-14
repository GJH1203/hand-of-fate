"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * The surface everything sits on.
 *
 * Three tones, and on paper they mean something they could not mean on glass, where
 * every one of them was some quantity of white at some low alpha:
 *
 *   raised  — `.sheet`. Bone stock with its fibre and the one shadow in the system,
 *             the cast a piece of paper genuinely makes on a table. For anything
 *             that is its own object.
 *   quiet   — paper-sunk, no edge. A well pressed into the sheet it is already on.
 *             The default for grouping, and it costs no rule and no shadow.
 *   outline — a full-weight ink rule and no fill. For things that are containers
 *             rather than objects.
 */
const panelVariants = cva("relative", {
  variants: {
    tone: {
      quiet: "bg-paper-sunk",
      raised: "sheet",
      outline: "border-rule border-ink bg-transparent",
    },
  },
  defaultVariants: {
    tone: "raised",
  },
});

export interface PanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelVariants> {
  /**
   * Accepted and ignored.
   *
   * This used to light the border under the cursor — a radial gradient tracking the
   * pointer, which is the cheapest way to make a flat dark surface feel like a
   * material and has nothing whatever to say about a sheet of paper. It is a glass
   * idiom and there is no glass. The prop stays in the signature only because
   * `GameModeSelection` still passes it; it can be deleted outright once that file
   * has been through.
   */
  spotlight?: boolean;
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, tone, spotlight: _spotlight, children, ...props }, ref) => (
    <div ref={ref} className={cn(panelVariants({ tone }), className)} {...props}>
      {children}
    </div>
  ),
);
Panel.displayName = "Panel";

interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Anything that belongs on the right of the header — a badge, a button. */
  action?: React.ReactNode;
}

/**
 * The title, then a heavy rule under it.
 *
 * There used to be a short ember tick standing to the left of every heading, which
 * was itself a replacement for a gold icon. Both were a mark beside the words saying
 * "this is a heading" — the job the words were already doing. A 3px rule beneath
 * instead is how a section head is set on a printed page, it groups the title with
 * the body rather than with the margin, and `--rule-heavy` exists for exactly this.
 */
function PanelHeader({ title, subtitle, action, className, ...props }: PanelHeaderProps) {
  return (
    <div className={cn("px-5 pb-3 pt-4", className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="type-h2 truncate text-ink">{title}</h2>
          {subtitle && <p className="type-small mt-0.5 text-ink-2">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div aria-hidden className="mt-2.5 border-t-heavy border-ink" />
    </div>
  );
}

const PanelBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  /*
   * Bottom padding is a notch larger than the top. Equal padding measures equal and
   * looks top-heavy, because the cap height of the first line already eats into the
   * space above it.
   */
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 pb-6 pt-4", className)} {...props} />
  ),
);
PanelBody.displayName = "PanelBody";

export { Panel, PanelHeader, PanelBody, panelVariants };
