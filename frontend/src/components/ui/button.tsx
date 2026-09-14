import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Five faces.
 *
 * primary  — ember, and the only one of them. One per screen, on the thing the page
 *            exists to do. Dark text on the ember: white on a mid-tone warm fill
 *            reads as a hazard label, dark text reads as hot metal.
 * secondary— outlined. Anything you might do instead of the primary action.
 * ghost    — no chrome. Navigation and low-frequency actions.
 * link     — text only, with a rule that grows in from the left. The escape from
 *            every row being one filled button next to one outlined button; most
 *            tertiary actions are really just links wearing a button's clothes.
 * danger   — outlined in red, and no fill until hover. Destructive only.
 *
 * Every one of them presses. `translate-y-px` alone reads as a glitch, so the press
 * also takes a percent of scale off — the two together are what a physical key does.
 */
const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-ui font-semibold " +
    "transition-[color,background-color,border-color,box-shadow,transform,filter] duration-200 ease-arcane " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400 " +
    "disabled:pointer-events-none disabled:opacity-40 " +
    "active:translate-y-px active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-ember-300 to-ember-500 text-[#231405] shadow-sm " +
          "hover:-translate-y-px hover:shadow-glow-ember hover:brightness-[1.06] active:brightness-[0.97]",
        secondary:
          "border border-strong bg-white/[0.02] text-ink-hi " +
          "hover:border-ember-400/55 hover:bg-ember-400/[0.08] hover:text-ink-hi",
        ghost: "bg-transparent text-ink-mid hover:bg-white/[0.05] hover:text-ink-hi",
        link:
          "bg-transparent text-ember-300 hover:text-ember-400 active:translate-y-0 active:scale-100 " +
          "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 " +
          "after:bg-current after:transition-transform after:duration-200 after:ease-arcane hover:after:scale-x-100",
        danger:
          "border border-danger/35 bg-transparent text-danger hover:border-danger/70 hover:bg-danger/10",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
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
