import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * One field recipe, and it lives in globals.css as `.field-input`: a night-2 well
 * inside a gilt rule, set in Spectral with lining tabular figures. Everything the
 * old input did with a glow ring and a tinted shadow is done here with the weight
 * and the colour of a line — including the invalid state, which goes to cinnabar
 * rather than thickening, so it survives greyscale and forced-colors.
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
         * Disabled drops the rule from gilt to the bare edge of the night and the
         * text to `parchment-4`, which is the one value in the palette reserved for
         * a disabled control and may never carry content. State is carried by
         * weight and colour here, never by transparency.
         */
        "disabled:cursor-not-allowed disabled:border-night-3 disabled:bg-night-1 disabled:text-parchment-4",
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
  /**
   * Accepted and ignored, both of them.
   *
   * A glyph beside a label that already says "Email" is ornament, and ornament is
   * the one thing this system spends nothing on: an icon here has to carry meaning
   * the words do not — a copy button, a back arrow — or it does not appear. The
   * props stay in the signature because eight other units compile against it; no
   * call site passes either one today.
   */
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
 * The label is a lapidary one: Marcellus capitals at 12px with open tracking, which
 * is the apparatus around the field rather than its text. The line underneath is
 * Spectral, because it is a sentence and sentences are set in the reading face.
 *
 * THE ERROR IS `.field-error`, and that is the whole of the treatment: a cinnabar
 * rule down its edge with the words left in parchment. This used to set the
 * sentence itself in cinnabar, which is under the contrast floor at this size on
 * the night — and it disagreed with the login page, which had already worked the
 * same problem out and drawn the rule by hand. One recipe, kept in globals.css
 * with the reasoning, so the two cannot drift apart again. `.rubric` stays for a
 * block-level correction; this is the line under a single field.
 */
function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="type-label mb-2 block text-parchment-2">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="field-error mt-2 text-[13px] leading-[1.45]"
        >
          {error}
        </p>
      ) : (
        hint && <p className="mt-2 text-[13px] leading-[1.45] text-parchment-3">{hint}</p>
      )}
    </div>
  );
}

export { Input, Field };
