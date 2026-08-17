import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** The surface everything sits on: one step up from the page, a hairline, a soft drop. */
const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border border-subtle bg-surface-1 shadow-card", className)}
      {...props}
    />
  ),
);
Panel.displayName = "Panel";

interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Anything that belongs on the right of the header — a badge, a button. */
  action?: React.ReactNode;
}

/** Replaces the "bright yellow heading" pattern: a gold 18px icon, then normal text. */
function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-subtle px-5 py-4",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-gold-400" />}
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
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5", className)} {...props} />,
);
PanelBody.displayName = "PanelBody";

export { Panel, PanelHeader, PanelBody };
