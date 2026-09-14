import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Five faces, printed rather than lit.
 *
 * The old set was a gradient key, an outlined key, a ghost, an underline and a red
 * outline — five, but only because a gradient and a glow were doing the work that a
 * rule now does. On paper the whole hierarchy is available in one ink: a control is
 * either the key plate solid, the key plate as an outline, or no edge at all until
 * you reach for it.
 *
 * primary  — `.btn--key`. The ink plate laid solid, paper knocked out of it. One per
 *            screen, on the thing the page exists to do. Its hover goes to
 *            vermillion-deep, which is the only place a colour plate ever fills a
 *            control.
 * secondary— `.btn--rule`. A ruled box. Anything you might do instead of the primary.
 * ghost    — `.btn--quiet`. No edge until hover, when the rule is printed.
 * link     — `.link`. A word with a rule under it. Most tertiary actions are really
 *            links wearing a button's clothes, so they get to look like links.
 * danger   — a ruled box lettered in vermillion-deep. Deep rather than the full
 *            vermillion because the label is 12px and `--verm` is only legible as
 *            text at 24px and up.
 *
 * There is no fill that fakes light and no shadow anywhere. The press is
 * translateY(1px) and nothing else: on a press the ink is pushed INTO the sheet, so
 * a control goes down. It never lifts. `.btn:active` in globals.css carries that for
 * every variant except the link, which is not a `.btn` and gets it here.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "btn btn--key",
        secondary: "btn btn--rule",
        ghost: "btn btn--quiet",
        link:
          "link active:translate-y-px " +
          "disabled:cursor-not-allowed disabled:border-b-rule-min disabled:text-ink-4",
        danger: "btn btn--rule border-verm-deep text-verm-deep",
      },
      size: {
        sm: "h-8 px-3 text-[11px] [&_svg]:size-3.5",
        md: "h-10 px-4 text-xs [&_svg]:size-4",
        lg: "h-12 px-6 text-[13px] [&_svg]:size-[18px]",
        icon: "h-9 w-9 p-0 [&_svg]:size-4",
      },
    },
    /*
     * cva emits base, then variants, then compound variants, and tailwind-merge keeps
     * whichever of two conflicting utilities came last. A link has no box, so its
     * height and padding have to be reset *after* the size variant has had its say —
     * putting `h-auto px-0` in the variant itself loses to `h-10 px-4` every time.
     */
    compoundVariants: [{ variant: "link", class: "h-auto px-0" }],
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
