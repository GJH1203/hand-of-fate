import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-subtle bg-surface-2/80 px-3.5 text-sm text-ink-hi",
        "placeholder:text-ink-low",
        "transition-[border-color,box-shadow,background-color] duration-200 ease-arcane",
        "hover:border-strong",
        "focus:border-ember-400 focus:bg-surface-2 focus:outline-none focus:shadow-[0_0_0_3px_rgba(217,142,67,0.16)]",
        /*
         * Only after the field has been touched *and* left. Colouring an email field
         * red while somebody is still typing the first three characters of it is the
         * most common way form validation gets in the way of filling a form in.
         */
        "[&:user-invalid]:border-danger [&:user-invalid]:shadow-[0_0_0_3px_rgba(224,100,92,0.14)]",
        "disabled:opacity-40",
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
  /** Shown instead of the hint, in red, and announced. */
  error?: React.ReactNode;
  children: React.ReactNode;
}

/** Label above, input, then one line underneath — a hint, or an error in its place. */
function Field({
  label,
  htmlFor,
  icon: Icon,
  hint,
  hintIcon: HintIcon,
  error,
  children,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="type-label mb-1.5 flex items-center gap-1.5 text-ink-mid"
      >
        {Icon && <Icon size={13} strokeWidth={1.75} aria-hidden />}
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="type-small mt-1.5 text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p className="type-small mt-1.5 flex items-center gap-1.5 text-ink-low">
            {HintIcon && <HintIcon size={13} strokeWidth={1.75} aria-hidden />}
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export { Input, Field };
