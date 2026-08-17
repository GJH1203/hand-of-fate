import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** The only loading indicator. Inherits colour from whatever it sits in. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <Loader2
      size={size}
      strokeWidth={2}
      aria-hidden
      className={cn("animate-spin", className)}
    />
  );
}
