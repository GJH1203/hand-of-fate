import Link from 'next/link'

import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Page not found',
}

/*
 * The 404.
 *
 * There was not one, so a mistyped or stale URL got the stock Next.js page: white
 * background, Helvetica, a horizontal rule. On a site that is otherwise entirely dark
 * that is not a missing page so much as a broken one — people assume the site is down
 * rather than that they are one character off.
 *
 * The "404" is set in the display serif at a size nothing else on the site uses, so
 * the page is unmistakable, and both ways out are offered because a dead end without
 * a door is the actual failure here.
 */
export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center px-6 py-16">
      <p className="type-label text-ember-400">Nothing here</p>

      <p
        aria-hidden
        className="mt-4 font-display text-[clamp(5rem,14vw,9rem)] font-semibold leading-[0.82] tracking-[-0.05em] text-ink-hi"
      >
        4<span className="text-ember-gradient">0</span>4
      </p>

      <h1 className="type-h2 mt-6 text-ink-hi">This page does not exist</h1>
      <p className="type-body mt-3 text-ink-mid">
        The link may be out of date, or a character may have gone missing on the way here.
        Room codes expire when the room closes, so an old invite will land here too.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
        <Button asChild variant="primary" size="lg">
          <Link href="/">Back to the menu</Link>
        </Button>
        <Button asChild variant="link">
          <Link href="/game">Start a duel</Link>
        </Button>
      </div>
    </main>
  )
}
