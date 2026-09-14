import * as React from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "danger" | "success" | "warning" | "info";

const styles: Record<Tone, string> = {
  danger: "border-danger/25 bg-danger/[0.08] text-danger",
  success: "border-success/25 bg-success/[0.08] text-success",
  warning: "border-warning/25 bg-warning/[0.08] text-warning",
  info: "border-info/25 bg-info/[0.08] text-info",
};

const icons: Record<Tone, React.ElementType> = {
  danger: CircleAlert,
  success: CircleCheck,
  warning: TriangleAlert,
  info: Info,
};

interface InlineAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  children: React.ReactNode;
}

/**
 * The in-card message strip. Replaces the raw red box that used to carry whatever
 * string the server or a thrown Error happened to contain.
 */
export function InlineAlert({ tone = "danger", className, children, ...props }: InlineAlertProps) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        // A 2px bar down the leading edge, so the tone is legible before the text is.
        "flex items-start gap-2.5 rounded-md border border-l-2 p-3 text-[13px] leading-relaxed",
        styles[tone],
        className,
      )}
      {...props}
    >
      <Icon size={16} strokeWidth={1.75} className="mt-px shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
