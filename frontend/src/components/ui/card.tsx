import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * shadcn's Card, retoned onto paper. It is not dead — `Leaderboard` still builds
 * every panel out of it — but it is the last surface in the application that is not
 * a `Panel`, and the two should converge.
 *
 * A card here is a lifted object rather than a sheet: paper-raised stock inside a
 * full-weight ink rule, square, no shadow. The `shadow-sm` it shipped with is gone
 * for good, along with the 11px radius; the one shadow in this design belongs to
 * `.sheet` and is spent already.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "border-rule border-ink bg-paper-raised text-ink",
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
   * `tracking-tight` is gone rather than retuned. A renaissance face opens up under
   * its own weight; closing it is a grotesque's habit and there is no negative
   * tracking anywhere in this system.
   */
  <div
    ref={ref}
    className={cn("type-h2 text-ink", className)}
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
    className={cn("type-small text-ink-2", className)}
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
