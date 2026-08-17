import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Four faces, and only four.
 *
 * primary  — gold, and the only one of them. One per screen, on the thing the page
 *            exists to do. Dark text on the gold: white on gold reads as a warning
 *            label, dark text reads as metal.
 * secondary— outlined. Anything you might do instead of the primary action.
 * ghost    — no chrome. Navigation and low-frequency actions.
 * danger   — outlined in red. Destructive, and never gets a fill until hover.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-ui font-semibold " +
    "transition-[color,background-color,border-color,box-shadow,filter] duration-150 " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400 " +
    "disabled:pointer-events-none disabled:opacity-45 " +
    "active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-gold-300 to-gold-500 text-[#1A1206] hover:brightness-[1.07] hover:shadow-glow-gold",
        secondary:
          "border border-strong bg-transparent text-ink-hi hover:border-arcane-400 hover:bg-arcane-400/10",
        ghost: "bg-transparent text-ink-mid hover:bg-surface-3 hover:text-ink-hi",
        danger:
          "border border-danger/35 bg-transparent text-danger hover:bg-danger/10 hover:border-danger/60",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
        icon: "h-9 w-9 p-0 [&_svg]:size-4",
      },
    },
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
