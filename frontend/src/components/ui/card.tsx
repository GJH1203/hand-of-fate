import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * shadcn's Card, retoned onto the night.
 *
 * It has exactly one importer, `Leaderboard`, and `Leaderboard` has none of its own:
 * nothing in the application renders it, so this whole file is reachable only
 * through dead code. It is retoned rather than deleted because deleting a component
 * another unit may be about to pick up is not this unit's call — but the two should
 * converge on `Panel`, and the honest end state is that both this and the
 * leaderboard go.
 *
 * A card here is a lifted object rather than a framed one: a night-1 board inside a
 * single gilt rule, square, no shadow. The `shadow-sm` it shipped with is gone for
 * good along with the 11px radius — depth in this design is a gilt frame and an
 * aureole of drawn rings, and a blurred cast shadow is the idiom it exists against.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "border-rule border-gold-deep bg-night-1 text-parchment",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  /*
   * `tracking-tight` is gone rather than retuned. Marcellus is cut from Roman
   * inscriptional capitals and they are carved with air between them; closing that
   * up is a grotesque's habit, and there is no negative tracking anywhere in this
   * system.
   */
  <div
    ref={ref}
    className={cn("type-h2 text-parchment", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("type-small text-parchment-2", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
