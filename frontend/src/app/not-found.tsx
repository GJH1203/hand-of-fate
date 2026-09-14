import Link from 'next/link'

export const metadata = {
  title: 'Page not found',
}

/*
 * The 404, and the first panel set in the new system.
 *
 * Axial, because everything here is: the divine is frontal and centred, and the
 * two designs before this one broke symmetry for a defensive reason — asymmetry
 * is how you avoid looking generated. A temple is not asymmetric.
 */
export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[620px] items-center px-6 py-16">
      <div className="panel w-full px-8 pb-12 pt-12 text-center sm:px-14">
        <p className="type-label text-gold">Nothing here</p>

        {/* The numeral is gilded, because a number is the one thing on this page
            worth any of the light. */}
        <p aria-hidden className="type-num mt-8 text-[clamp(4rem,13vw,7rem)] leading-[0.85] text-gold-lit">
          404
        </p>

        <div aria-hidden className="mx-auto mt-8 h-px w-28 bg-gold-deep" />

        <h1 className="type-h2 mt-8 text-parchment">This page does not exist</h1>

        <p className="type-body mx-auto mt-5 text-parchment-2">
          The link may be out of date, or a character may have gone missing on the way here.
          A room code stops working when its room closes, so an old invitation lands here too.
        </p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          <Link href="/" className="btn btn--key h-12 px-7">
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
