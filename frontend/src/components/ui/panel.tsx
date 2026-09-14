"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * The surface everything sits on.
 *
 * The old Panel was one thing: hairline, background, drop shadow, on every surface
 * in the application. When every box is elevated, elevation stops meaning anything —
 * so there are three now, and which one a surface gets says how important it is.
 *
 *   quiet   — background only, no border, no shadow. The default for grouping.
 *   raised  — real glass with a lit top edge. For anything that floats.
 *   outline — hairline only, no fill. For things that are containers, not objects.
 */
const panelVariants = cva("relative rounded-lg", {
  variants: {
    tone: {
      quiet: "bg-surface-1/70",
      raised: "glass rounded-lg",
      outline: "border border-subtle bg-transparent",
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
   * Lights the border under the cursor.
   *
   * A card that reacts to where the pointer is, rather than only to whether it is
   * inside, is the cheapest way to make a flat dark surface feel like a material.
   * Only worth it on things you can actually click.
   */
  spotlight?: boolean;
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, tone, spotlight, children, onMouseMove, style, ...props }, ref) => {
    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
      if (spotlight) {
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
        event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
      }
      onMouseMove?.(event);
    };

    return (
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        className={cn(
          panelVariants({ tone }),
          spotlight && "group/spotlight overflow-hidden",
          className,
        )}
        style={style}
        {...props}
      >
        {spotlight && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-arcane group-hover/spotlight:opacity-100"
            style={{
              background:
                "radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgba(217,142,67,0.13), transparent 70%)",
            }}
          />
        )}
        {children}
      </div>
    );
  },
);
Panel.displayName = "Panel";

interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Anything that belongs on the right of the header — a badge, a button. */
  action?: React.ReactNode;
}

/**
 * A short ember rule, then the title.
 *
 * The rule replaces the gold icon that used to sit beside every heading. Six panels
 * on a page meant six gold icons, which is a lot of colour spent on decoration —
 * and the icons were mostly generic anyway (a trophy for records, a scroll for
 * rules). A 2px mark does the same grouping work and spends almost nothing.
 */
function PanelHeader({
  title,
  subtitle,
  action,
  className,
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 px-5 pb-3 pt-4", className)}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="mt-2 h-4 w-[2px] shrink-0 rounded-full bg-ember-400" />
        <div className="min-w-0">
          <h2 className="type-h2 truncate text-ink-hi">{title}</h2>
          {subtitle && <p className="type-small mt-0.5 text-ink-low">{subtitle}</p>}
        </div>
      </div>
      {action}
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
