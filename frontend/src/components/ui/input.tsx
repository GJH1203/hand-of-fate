import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * One field recipe, and it lives in globals.css as `.field-input`: paper-raised
 * stock, a full-weight ink rule, mono figures. Everything the old input did with a
 * glow ring and a tinted shadow is now done with the weight of a line — including
 * the invalid state, which thickens the rule to 3px rather than turning it red, so
 * it survives greyscale and forced-colors.
 *
 * `:user-invalid` (not `:invalid`) is set on the class in globals.css, with the
 * reasoning kept there: a half-typed address is not yet wrong, and marking it while
 * somebody is on the third character is the most common way validation gets in the
 * way of filling a form in.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "field-input",
        /*
         * Disabled drops to the lighter rule and the disabled ink rather than to a
         * lower opacity — weight and density carry state here, never transparency.
         * The fill stays on paper-sunk: paper-deep never carries text, and a
         * disabled field still has to be readable.
         */
        "disabled:cursor-not-allowed disabled:border-rule-min disabled:bg-paper-sunk disabled:text-ink-4",
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
  /** Shown instead of the hint, and announced. */
  error?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Label above, input, then one line underneath — a hint, or an error in its place.
 *
 * Label, hint and error are all mono. They are the apparatus around the printed
 * artefact rather than its text, and the serif has a hard 15px floor that none of
 * them could sit above without shouting.
 */
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
      <label htmlFor={htmlFor} className="type-label mb-2 flex items-center gap-1.5 text-ink-2">
        {Icon && <Icon size={13} strokeWidth={1.75} aria-hidden />}
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-2 font-mono text-[12px] leading-[1.45] text-verm-deep"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] leading-[1.45] text-ink-3">
            {HintIcon && <HintIcon size={13} strokeWidth={1.75} aria-hidden />}
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export { Input, Field };
