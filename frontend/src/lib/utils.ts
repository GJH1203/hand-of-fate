import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/*
 * tailwind-merge has to be taught this design's border widths, and the failure
 * without it is silent and total.
 *
 * Hierarchy here is carried by the WEIGHT of a rule rather than by opacity, so the
 * theme defines `border-hair` (0.75px), `border-rule` (1.5px) and `border-heavy`
 * (3px). tailwind-merge does not read the Tailwind config: it recognises border
 * widths by a built-in list of keywords (a bare number, `px`, or an arbitrary
 * value). `hair`, `rule` and `heavy` are none of those, so it files them as border
 * *colours* — and then, doing exactly its job, drops the earlier of two colours:
 *
 *     cn('border-rule border-ink')  ->  'border-ink'
 *
 * Tailwind's preflight sets `border-width: 0`, so the result is not a thinner edge,
 * it is no edge. Every card on the board, every card in the hand, the sidebar rows,
 * the lobby's seat dividers and the errata bar were all rendering borderless.
 *
 * Registering the three names in the width groups fixes it for every call site at
 * once. The per-side groups are listed separately because tailwind-merge keys them
 * independently — `border-t-*` does not inherit from `border-*`.
 */
const SIZES = ["hair", "rule", "heavy"]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "border-w": [{ border: SIZES }],
      "border-w-x": [{ "border-x": SIZES }],
      "border-w-y": [{ "border-y": SIZES }],
      "border-w-s": [{ "border-s": SIZES }],
      "border-w-e": [{ "border-e": SIZES }],
      "border-w-t": [{ "border-t": SIZES }],
      "border-w-r": [{ "border-r": SIZES }],
      "border-w-b": [{ "border-b": SIZES }],
      "border-w-l": [{ "border-l": SIZES }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
