import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Five faces, cut square and lettered in Roman capitals.
 *
 * A control is not a niche. The arch in this system marks something that CONTAINS a
 * figure — a panel, a board square, a slug a room-code character is set in — and an
 * arched button reads as a headstone. So every one of these is square, and the
 * difference between them is the weight of a rule and whether the gold is lit or
 * only drawn.
 *
 * primary  — `.btn--key`. The gilded ground, with the ink knocked out of it. ONE per
 *            screen, on the thing the page exists to do. Gold here is not a colour,
 *            it is light: spent on everything it is a casino, spent once it is a
 *            reliquary.
 * secondary— `.btn`. A gilt rule around nothing. Anything you might do instead of
 *            the primary.
 * ghost    — `.btn--quiet`. No edge until you reach for it, when the rule is drawn.
 * link     — `.link`. A word with a rule under it. Most tertiary actions are really
 *            links wearing a button's clothes, so they get to look like links.
 * danger   — a ruled box lettered in cinnabar. Cinnabar is rubrication: in a
 *            manuscript red is an index rather than an emotion, and it marks the one
 *            place you are meant to look before you commit to something.
 *
 * There is no gradient faking light on any of them and no shadow anywhere. Depth in
 * this design is a gilt frame and an aureole of drawn rings, and both belong to
 * surfaces rather than controls.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "btn btn--key",
        secondary: "btn",
        ghost: "btn btn--quiet",
        link:
          "link disabled:cursor-not-allowed disabled:border-b-night-3 disabled:text-parchment-4",
        /*
         * The hover pair is written as an arbitrary variant rather than `hover:`.
         * `.btn:hover:not(:disabled)` in globals.css scores (0,3,0) and takes the
         * border back to gold; a plain `hover:border-cinnabar` is only (0,2,0) and
         * loses to it, so a danger control turned gold under the cursor. Matching
         * the selector matches the specificity, and the utility layer is emitted
         * after the component layer, so the later rule wins the tie.
         */
        danger:
          "btn border-cinnabar text-cinnabar " +
          "[&:hover:not(:disabled)]:border-cinnabar [&:hover:not(:disabled)]:bg-cinnabar/10",
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
