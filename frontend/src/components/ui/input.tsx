import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-subtle bg-surface-2 px-3.5 text-sm text-ink-hi",
        "placeholder:text-ink-low",
        "transition-[border-color,box-shadow] duration-150",
        "focus:border-arcane-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(132,104,228,0.18)]",
        "disabled:opacity-45",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

interface FieldProps {
  label: string;
  htmlFor: string;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  hintIcon?: LucideIcon;
  children: React.ReactNode;
}

/** Label above, input, optional hint below. The only form row shape in the app. */
function Field({ label, htmlFor, icon: Icon, hint, hintIcon: HintIcon, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="type-micro mb-2 flex items-center gap-1.5 text-ink-mid">
        {Icon && <Icon size={14} strokeWidth={1.75} />}
        {label}
      </label>
      {children}
      {hint && (
        <p className="type-small mt-2 flex items-center gap-1.5 text-ink-low">
          {HintIcon && <HintIcon size={14} strokeWidth={1.75} />}
          {hint}
        </p>
      )}
    </div>
  );
}

export { Input, Field };
