import Link from 'next/link'

export const metadata = {
  title: 'Page not found',
}

/*
 * The 404, and the first sheet to be set in the new system.
 *
 * The numeral is mono, not serif, because it is a number and that rule has no
 * exceptions. The headline's descenders cross the rule beneath it on purpose —
 * one of three mandated collisions in the design, there to break the habit of
 * every element being separated from every other by a token from the same small
 * set of gaps.
 */
export default function NotFound() {
  return (
    <main id="main" className="mx-auto min-h-dvh w-full max-w-[640px] px-0 sm:px-8 sm:py-12">
      <div className="sheet min-h-dvh px-7 py-14 sm:min-h-0 sm:px-14 sm:py-20">
        <p className="type-label text-verm-text">Nothing here</p>

        <p aria-hidden className="type-num mt-5 text-[clamp(4.5rem,16vw,8rem)] leading-[0.8] text-ink">
          404
        </p>

        <h1 className="type-h2 mt-8 -mb-[0.18em] text-ink">This page does not exist</h1>
        <hr className="mt-3 border-0 border-t border-t-ink" style={{ borderTopWidth: 'var(--rule)' }} />

        <p className="type-body mt-5 text-ink-2">
          The link may be out of date, or a character may have gone missing on the way here.
          A room code stops working when its room closes, so an old invitation lands here too.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href="/" className="btn btn--key h-11 px-5">
            Back to the menu
          </Link>
          <Link href="/game" className="link">
            Start a duel
          </Link>
        </div>
      </div>
    </main>
  )
}
