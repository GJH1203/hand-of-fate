// src/app/page.tsx
'use client';

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy } from 'lucide-react'

import { Skeleton, Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth'
import { playerService, type PlayerDto } from '@/services/playerService'
import BoardDiagram from '@/components/home/BoardDiagram'
import GuidedTutorial from '@/components/tutorial/GuidedTutorial'

/*
 * Three steps, in the order they happen in a match. The old page had two bulleted
 * lists of three — "Basic Principles" and "Victory Conditions" — which between them
 * restated the same rule twice and left out the only one a new player gets wrong
 * (that you may not place anywhere you like). Numbered, because they are sequential;
 * three of them, set as three panels, because the game is three columns and the page
 * should say so more than once.
 */
const STEPS = [
  {
    title: 'Take a square',
    body: 'You hold five cards. Each is worth 1, 3 or 5 power, counted in stars on its face, and each one you play claims a square on a board three columns wide and five rows deep.',
  },
  {
    title: 'Stay next to your own',
    body: 'After your first card, every card has to go beside one you already own — above, below, or to either side. That constraint is the whole game: where you start decides where you can still go.',
  },
  {
    title: 'Take two columns',
    body: 'A column belongs to whoever has more power in it. Equal power and nobody takes it. Win two of the three and the duel is yours.',
  },
]

export default function Home() {
  const { isAuthenticated, user, logout, isLoading } = useUnifiedAuth();
  const router = useRouter();
  const toast = useToast();
  const [playerData, setPlayerData] = useState<PlayerDto | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !user?.playerId) return;

    let cancelled = false;
    const fetchPlayerData = async () => {
      try {
        setLoadingStats(true);
        const data = await playerService.getPlayer(user.playerId);
        if (!cancelled) setPlayerData(data);
      } catch (error) {
        console.error('Failed to fetch player data:', error);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    fetchPlayerData();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.playerId]);

  // First visit gets the guided tutorial, once.
  useEffect(() => {
    if (!isAuthenticated || !user?.playerId || onboardingChecked) return;
    setOnboardingChecked(true);
    if (!localStorage.getItem(`tutorial_completed_${user.playerId}`)) {
      setShowTutorial(true);
    }
  }, [isAuthenticated, user?.playerId, onboardingChecked]);

  const finishTutorial = () => {
    setShowTutorial(false);
    if (user?.playerId) {
      localStorage.setItem(`tutorial_completed_${user.playerId}`, 'true');
    }
  };

  if (isLoading) {
    /*
     * In a panel of its own. A line of text centred on the bare firmament would be
     * one lit thing floating in a night sky, which is a thing this design reserves
     * for the board.
     */
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="panel flex items-center gap-3 px-7 py-5">
          <Spinner size={16} className="text-gold" />
          <span className="type-label text-parchment-2">Checking your session</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (showTutorial && user?.playerId) {
    return (
      <GuidedTutorial
        playerName={user.username || 'Player'}
        onComplete={finishTutorial}
        onSkip={finishTutorial}
      />
    );
  }

  const lifetimeScore = playerData?.lifetimeScore ?? 0;

  const copyPlayerId = async () => {
    if (!user?.playerId) return;
    await navigator.clipboard.writeText(user.playerId);
    setCopied(true);
    // No tone: there is no success colour in this system, and a confirmation that
    // something was copied does not need one.
    toast('Player ID copied');
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    /*
     * The menu is axial, and that is a reversal. The two designs before this one
     * broke symmetry deliberately, on the defensive argument that asymmetry is how
     * you avoid looking generated — a 7/5 hero with a stat plate dropped past the
     * headline's baseline. The divine is not asymmetric. A temple is axial, an icon
     * frontal, a tympanum centred, so everything here stands on one centre line and
     * the board stands on it as the altar.
     */
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-[980px] px-5 sm:px-8">
        {/*
         * The apparatus, ruled off at the head of the page rather than floating over
         * it — the previous header was a translucent bar with the page smeared
         * through it, and there is no glass anywhere in this system.
         *
         * It is symmetric like everything else: your name on the centre line, a
         * control to either side of it. Three columns, which by now is the joke the
         * whole interface is built on.
         */}
        <header className="border-b-hair border-gold-deep">
          <div className="grid h-[78px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <div className="justify-self-start">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="btn btn--quiet h-9 px-2.5 sm:px-3"
              >
                Tutorial
              </button>
            </div>

            <div className="flex min-w-0 flex-col items-center gap-1.5">
              {/*
               * A cartouche is the enclosure this system sets a name in, and you are
               * Sol, so it is the gilded one. It replaces a squared monogram plate:
               * the name is already here, and a synthesised initial beside it was
               * ornament standing in for a portrait nobody has.
               */}
              <span className="cartouche cartouche--sol max-w-[52vw] sm:max-w-[300px]">
                <span className="min-w-0 truncate">{user?.username}</span>
              </span>

              <button
                type="button"
                onClick={copyPlayerId}
                aria-label="Copy your full player ID"
                className="group flex min-w-0 max-w-[52vw] items-center gap-1.5 text-[11px] tracking-[0.06em] text-parchment-3 transition-colors duration-lume hover:text-gold-lit sm:max-w-none"
              >
                <span className="truncate tabular">{user?.playerId?.slice(0, 8)}…</span>
                {copied ? (
                  <Check size={12} strokeWidth={2} className="shrink-0 text-gold-lit" />
                ) : (
                  <Copy
                    size={12}
                    strokeWidth={1.75}
                    className="shrink-0 opacity-70 group-hover:opacity-100"
                  />
                )}
              </button>
            </div>

            {/*
             * No icons on these two. An icon earns its place when it is the whole
             * control — the copy button above has no label and needs one — and is
             * ornament when it sits next to a word that already says it.
             */}
            <div className="justify-self-end">
              <button type="button" onClick={logout} className="btn btn--quiet h-9 px-2.5 sm:px-3">
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="pt-14 sm:pt-20">
          <section className="text-center">
            <p className="type-label interpunct text-gold">
              <span>Real-time</span>
              <span>one against one</span>
            </p>

            <h1 className="type-display mt-6 text-parchment">
              Three columns.
              <br />
              {/*
               * Gold is light, not a colour, so it falls on the line that carries the
               * whole rule of the game and on nothing else in this block. At display
               * size --gold-lit measures 11.6:1 on the night; there is no smaller
               * gold on this page that would have to be reasoned about separately.
               */}
              <span className="text-gold-lit">Take two.</span>
            </h1>

            <p className="type-body mx-auto mt-7 text-parchment-2">
              Five cards each, fifteen squares, and one rule that decides everything: you can
              only build outward from what you already hold. Read the board, starve the column
              they want, and take the two that matter.
            </p>

            {/*
             * The one gilded control on the screen. Everything else on this page that
             * can be clicked is a ruled outline or an underlined line of capitals,
             * which is what makes this one read as the way in without a single pixel
             * of it moving.
             */}
            <div className="mt-11 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
              <Link href="/game" className="btn btn--key h-12 px-8">
                Enter the arena
              </Link>
              <button type="button" onClick={() => setShowTutorial(true)} className="link">
                Walk me through a turn
              </button>
            </div>

            <p className="type-small mt-8 text-parchment-3">
              Campaign mode is not built yet. Online duels are.
            </p>
          </section>

          {/*
           * The altar. The diagram used to be a 220px ornament in the foot of a
           * sidebar plate, under the stat it shared a box with; it is the only thing
           * on the page that shows what winning a column actually looks like, and it
           * is now the object the page is arranged around.
           */}
          <section
            aria-labelledby="board-heading"
            className="mt-20 flex flex-col items-center sm:mt-24"
          >
            <h2 id="board-heading" className="type-label text-gold">
              A finished board
            </h2>
            <span aria-hidden className="mt-5 block h-px w-16 bg-gold-deep" />

            <BoardDiagram className="mt-9" />
          </section>

          <section className="mt-20 flex justify-center sm:mt-24">
            <div className="panel w-full max-w-[420px] px-8 py-10 text-center">
              <p className="type-label text-parchment-3">Power score</p>

              {loadingStats ? (
                <Skeleton className="mx-auto mt-4 h-[60px] w-32 bg-night-3" />
              ) : (
                /*
                 * A number, so it is Spectral — an ephemeris sets its tables in the
                 * text face and not in a second one — and it is gilded, because a
                 * count of what you have won is the one figure on this page worth any
                 * of the light.
                 */
                <p className="type-num mt-4 text-[60px] leading-none text-gold-lit">
                  {lifetimeScore}
                </p>
              )}

              <p className="type-small mx-auto mt-5 max-w-[34ch] text-parchment-2">
                Earned one duel at a time. It only goes up when you win.
              </p>
            </div>
          </section>

          {/*
           * The rules as three panels rather than a numbered list down one side of a
           * 4/8 grid: three is the number this game is built on, and a row of three
           * arched-headed panels is the same triptych the board is, said again in
           * type. Each step is a numeral, a hairline and a paragraph — the numeral
           * carries the order, so none of them needs a badge.
           */}
          <section aria-labelledby="rules-heading" className="mt-20 sm:mt-28">
            <div className="text-center">
              <h2 id="rules-heading" className="type-h1 text-parchment">
                How a duel goes
              </h2>
              <p className="type-small mx-auto mt-5 max-w-[46ch] text-parchment-2">
                About four minutes, start to finish. There is no deck to build and nothing to
                unlock — every match starts from the same five cards.
              </p>
            </div>

            <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="panel flex flex-col items-center px-6 pb-9 pt-8 text-center"
                >
                  <span className="type-num text-[15px] tracking-[0.16em] text-gold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden className="mt-4 block h-px w-10 bg-gold-deep" />

                  <h3 className="type-h2 mt-6 text-parchment">{step.title}</h3>
                  <p className="type-small mt-4 text-parchment-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>
        </main>

        {/*
         * A colophon rather than a footer band. There is nothing to put in a second
         * bar, and inventing privacy and terms pages to fill one would be inventing
         * pages.
         */}
        <footer className="mt-20 border-t-hair border-gold-deep pb-16 pt-7 text-center sm:mt-28">
          <p className="type-small text-parchment-3">
            Hand of Fate — a 1v1 card duel at{' '}
            <a
              href="https://handoffate.org"
              className="text-parchment-2 underline decoration-gold-deep decoration-[1.5px] underline-offset-[3px] transition-colors duration-lume hover:text-gold-lit hover:decoration-gold"
            >
              handoffate.org
            </a>
          </p>
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="link mt-6 inline-block"
          >
            How to play
          </button>
        </footer>
      </div>
    </div>
  )
}
