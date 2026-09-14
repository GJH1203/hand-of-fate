"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * The surface everything sits on.
 *
 * Three tones, and on the night they mean something they could not mean on glass,
 * where every one of them was some quantity of white at some low alpha:
 *
 *   raised  — `.panel`. A dark board inside a gilt frame, the way an altarpiece is
 *             built: two rules with air between them, because a single line is a
 *             border and two lines with a gap is a frame. For anything that is its
 *             own object.
 *   quiet   — night-2, no edge. A raised ground pressed into the panel it is already
 *             on. The default for grouping, and it costs no rule at all.
 *   outline — a gilt rule and no fill. For things that are containers rather than
 *             objects.
 *
 * None of the three is arched. An arch marks a NICHE — something that holds a
 * figure — and a panel that holds a list of rows is furniture, not a shrine. The
 * arched variants are `.panel--arched` and `.niche`, applied by the screens that
 * genuinely frame something.
 */
const panelVariants = cva("relative", {
  variants: {
    tone: {
      quiet: "bg-night-2",
      raised: "panel",
      outline: "border-rule border-gold-deep bg-transparent",
    },
  },
  defaultVariants: {
    tone: "raised",
  },
});

export interface PanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelVariants> {}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, tone, children, ...props }, ref) => (
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
 * The title in Roman capitals, then a gilt rule under it.
 *
 * There used to be a short tick standing to the left of every heading, which was
 * itself a replacement for a gold icon. Both were a mark beside the words saying
 * "this is a heading" — the job the words were already doing. A rule beneath instead
 * is how a section head is set on a page, and it groups the title with the body
 * rather than with the margin.
 *
 * A header with nothing on its right is CENTRED, because this design is axial and a
 * title with no counterweight ranged left is a composition apologising for itself.
 * One with an `action` stays ranged left: there is no way to centre a line that has
 * a control at one end of it, and pretending otherwise moves the title off the axis
 * anyway.
 */
function PanelHeader({ title, subtitle, action, className, ...props }: PanelHeaderProps) {
  return (
    <div className={cn("px-5 pb-3 pt-4", className)} {...props}>
      <div className={cn("flex items-start justify-between gap-4", !action && "justify-center")}>
        <div className={cn("min-w-0", !action && "text-center")}>
          <h2 className="type-h2 truncate text-parchment">{title}</h2>
          {subtitle && <p className="type-small mt-1 text-parchment-2">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div aria-hidden className="mt-3 border-t-rule border-gold-deep" />
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
