import { cn } from '@/lib/utils';

/*
 * Power, counted in stars.
 *
 * A card's power is 1, 3 or 5, and it used to be a numeral printed over the
 * artwork at 13px. That was worse than it sounds, because the artwork actively
 * misinforms: the power-5 card is a single bolt and has LESS drawn matter on it
 * than the branching power-3 card, so the picture and the number argue with each
 * other. Counting settles it, and counting survives being reduced — at the 48px
 * floor the board uses, a 13px numeral is a smudge and three stars are three
 * stars.
 *
 * The mark is a four-pointed star with rays, which is what every engraved
 * celestial chart from Bayer onward uses for a body, sized by its magnitude.
 * Here the size is constant and the COUNT carries the value, because a player
 * has to read three columns of them in a couple of seconds and comparing counts
 * is faster than comparing areas.
 *
 * The stars are not a picture of the number. They are the number.
 */

const PIPS: Record<number, string> = {
  1: 'M12.00 8.00L12.95 11.05L16.00 12.00L12.95 12.95L12.00 16.00L11.05 12.95L8.00 12.00L11.05 11.05Z',
  3: 'M12.00 1.70L12.78 4.22L15.30 5.00L12.78 5.78L12.00 8.30L11.22 5.78L8.70 5.00L11.22 4.22ZM12.00 8.70L12.78 11.22L15.30 12.00L12.78 12.78L12.00 15.30L11.22 12.78L8.70 12.00L11.22 11.22ZM12.00 15.70L12.78 18.22L15.30 19.00L12.78 19.78L12.00 22.30L11.22 19.78L8.70 19.00L11.22 18.22Z',
  5: 'M6.00 3.00L6.71 5.29L9.00 6.00L6.71 6.71L6.00 9.00L5.29 6.71L3.00 6.00L5.29 5.29ZM18.00 3.00L18.71 5.29L21.00 6.00L18.71 6.71L18.00 9.00L17.29 6.71L15.00 6.00L17.29 5.29ZM12.00 9.00L12.71 11.29L15.00 12.00L12.71 12.71L12.00 15.00L11.29 12.71L9.00 12.00L11.29 11.29ZM6.00 15.00L6.71 17.29L9.00 18.00L6.71 18.71L6.00 21.00L5.29 18.71L3.00 18.00L5.29 17.29ZM18.00 15.00L18.71 17.29L21.00 18.00L18.71 18.71L18.00 21.00L17.29 18.71L15.00 18.00L17.29 17.29Z',
};

interface PipsProps {
  power: number;
  className?: string;
  /** Only fixed-size uses pass this; on the board the stars fill the cell. */
  size?: number;
}

export default function Pips({ power, className, size }: PipsProps) {
  const path = PIPS[power];

  /*
   * The backend deals 1, 3 and 5 and has since the rules were written, but
   * nothing in the type system says so. A power with no figure falls back to a
   * numeral rather than rendering an empty card.
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
   * Sized by class, never by an inline style. An inline style beats any class,
   * so a `style={{width:'100%'}}` fallback silently ignored every caller that
   * asked for a proportion — and a ghost impression came out the same size as a
   * placed card, which is exactly the comparison the affordance exists to make.
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

/*
 * The owner's mark: a rayed disc for Sol, a crescent for Luna.
 *
 * This is the primary ownership channel and it is a SHAPE, which is stronger
 * than anything colour or hatching can do. Gold against silver measures about
 * 1.25:1 — even further apart than the vermillion and prussian it replaces — so
 * the metals are the last channel here, not the first. A sun is not a moon in
 * greyscale, at 48px, in a photograph, or to any form of colour blindness.
 */
export function OwnerMark({ mine, className }: { mine: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn('block', className)}>
      {mine ? (
        <>
          <circle cx="12" cy="12" r="5.2" fill="currentColor" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={12 + Math.cos(a) * 7.2}
                y1={12 + Math.sin(a) * 7.2}
                x2={12 + Math.cos(a) * 10.4}
                y2={12 + Math.sin(a) * 10.4}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            );
          })}
        </>
      ) : (
        /* A waxing crescent, cut by a second disc rather than drawn as an arc —
           a stroked arc thins to nothing when the mark is reduced. */
        <path
          d="M12 2.2a9.8 9.8 0 1 0 0 19.6a9.8 9.8 0 0 1 0-19.6Z"
          fill="currentColor"
          transform="rotate(-20 12 12)"
        />
      )}
    </svg>
  );
}
