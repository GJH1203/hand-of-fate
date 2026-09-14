import { cn } from '@/lib/utils';

/*
 * Power, counted.
 *
 * A card's power is 1, 3 or 5, and until now it was a numeral printed over the
 * artwork at 13px. That was worse than it sounds, because the artwork actively
 * misinforms: the power-5 card (a single bolt) has *less* drawn matter on it
 * than the power-3 card (a branching one), so the picture and the number argue.
 *
 * Pips settle it. One lozenge for 1, three in a column for 3, five in a
 * quincunx for 5 — countable at a glance at every size the board uses, down to
 * the 48px floor, where a 13px numeral is a smudge. This is the honest
 * borrowing from the tradition rather than a decorative one: a numeral card in
 * a Marseille deck counts its suit signs, it does not print a digit.
 *
 * The pips are not a picture of the number. They are the number.
 *
 * The lozenge is 5.2 units wide and 6.8 tall — taller than it is wide, never a
 * circle. A circle reads as a bullet; a lozenge reads as a printed mark.
 */

const PIPS: Record<number, string> = {
  1: 'M12 8.6L14.6 12L12 15.4L9.4 12Z',
  3: 'M12 1.6L14.6 5L12 8.4L9.4 5ZM12 8.6L14.6 12L12 15.4L9.4 12ZM12 15.6L14.6 19L12 22.4L9.4 19Z',
  5: 'M6 2.6L8.6 6L6 9.4L3.4 6ZM18 2.6L20.6 6L18 9.4L15.4 6ZM12 8.6L14.6 12L12 15.4L9.4 12ZM6 14.6L8.6 18L6 21.4L3.4 18ZM18 14.6L20.6 18L18 21.4L15.4 18Z',
};

interface PipsProps {
  power: number;
  className?: string;
  /** Only the hand card needs a fixed size; on the board the pips fill the cell. */
  size?: number;
}

export default function Pips({ power, className, size }: PipsProps) {
  const path = PIPS[power];

  /*
   * The backend's card powers are 1, 3 and 5 and have been since the rules were
   * written, but nothing in the type system says so. A power with no pip shape
   * falls back to a mono numeral rather than rendering an empty card.
   */
  if (!path) {
    return (
      <span
        aria-hidden
        className={cn('type-num leading-none', className)}
        style={size ? { fontSize: size * 0.7 } : undefined}
      >
        {power}
      </span>
    );
  }

  /*
   * Sized by class, never by an inline style.
   *
   * This used to fall back to `style={{width:'100%',height:'100%'}}` whenever no
   * explicit `size` was given, and an inline style beats any class — so every
   * caller that asked for a proportion (the board card's 72%, the cell's ghost at
   * 64%, the diagram's) was silently ignored and every pip group rendered at the
   * full width of its box. A ghost impression and a placed card came out the same
   * size, which is precisely the comparison the affordance exists to make.
   *
   * `w-full h-auto` are defaults in the same `cn()` call, so tailwind-merge lets a
   * caller's `w-[72%]` win.
   */
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn('block', size ? undefined : 'h-auto w-full', className)}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
