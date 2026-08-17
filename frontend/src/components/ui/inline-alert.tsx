import * as React from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "danger" | "success" | "warning" | "info";

const styles: Record<Tone, string> = {
  danger: "border-danger/30 bg-danger/10 text-danger",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
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
        "flex items-start gap-2.5 rounded-md border p-3 text-[13px] leading-relaxed",
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
