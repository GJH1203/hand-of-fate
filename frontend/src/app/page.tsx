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
 * (that you may not place anywhere you like). Numbered, because they are sequential.
 */
const STEPS = [
  {
    title: 'Take a square',
    body: 'You hold five cards. Each is worth 1, 3 or 5 power, and each one you play claims a square on a board three columns wide and five rows deep.',
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
     * On its own slip of paper. A line of ink centred on the bare table would be
     * dark-on-dark; nothing in this interface is printed anywhere but a sheet.
     */
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="sheet flex items-center gap-3 px-7 py-5">
          <Spinner size={16} className="text-ink-3" />
          <span className="type-label text-ink-2">Checking your session</span>
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
  const initial = (user?.username || '?').charAt(0).toUpperCase();

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
     * Two sheets on the table, with walnut in the margins once there is room for it.
     * Below `sm` they run to the edges — paper filling the desk is honest, and a
     * 16px strip of table down each side of a phone is not a margin, it is a seam.
     */
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-[1140px] px-0 pt-0 sm:px-8 sm:pt-6">
        {/*
         * The header is printed at the head of the sheet: bone paper, a heavy rule
         * under it, and `.sheet`'s own cast falling on whatever slides beneath. It
         * used to be a translucent bar with the page smeared through it, which is
         * the one piece of the old vocabulary this design has no answer for at all:
         * paper is opaque, and a strip of it pinned over a page hides the page.
         */}
        <header className="sticky top-0 z-sticky sm:top-6">
          <div className="sheet flex h-[70px] items-center justify-between gap-3 border-b-heavy px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/*
               * A square ruled box rather than a squircle. The initial is a stamp on
               * the sheet, so it is set in the mono with the rest of the apparatus,
               * and it is aria-hidden because the name is right beside it.
               */}
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center border-rule border-ink bg-paper-raised font-mono text-[15px] font-medium text-ink"
              >
                {initial}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[17px] leading-tight text-ink">
                    {user?.username}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={copyPlayerId}
                  aria-label="Copy your full player ID"
                  className="group mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-ink-3 transition-colors duration-ink hover:text-ink"
                >
                  <span className="truncate tabular">{user?.playerId?.slice(0, 8)}…</span>
                  {copied ? (
                    <Check size={12} strokeWidth={2} className="shrink-0 text-ink" />
                  ) : (
                    <Copy
                      size={12}
                      strokeWidth={1.75}
                      className="shrink-0 opacity-70 group-hover:opacity-100"
                    />
                  )}
                </button>
              </div>
            </div>

            {/*
             * No icons on these two. An icon earns its place when it is the whole
             * control — the copy button above has no label and needs one — and is
             * ornament when it sits next to a word that already says it.
             */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="btn btn--quiet h-9 px-2.5 sm:px-3"
              >
                Tutorial
              </button>
              <button type="button" onClick={logout} className="btn btn--quiet h-9 px-2.5 sm:px-3">
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="pb-0 sm:pb-14">
          {/*
           * The hero is a 12-column grid split 7/5 rather than a centred stack, and
           * the plate on the right is pulled down past the headline's baseline so the
           * two halves interlock instead of sitting in two tidy boxes. Everything in
           * the left column aligns to one edge; the old page centred five separate
           * elements and the eye had nowhere to rest.
           */}
          <div className="sheet mt-3 px-5 py-12 sm:mt-6 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
            <section className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <p className="type-label text-verm-text">Real-time · one against one</p>

                <h1 className="type-display mt-5 text-ink">
                  Three columns.
                  <br />
                  {/*
                   * Vermillion at full strength clears AA only from 24px up, which
                   * this line is four times over. Anywhere smaller it would have to
                   * be --verm-text, and there is no smaller vermillion on this page.
                   */}
                  <span className="text-verm">Take two.</span>
                </h1>

                <p className="type-body mt-6 text-ink-2">
                  Five cards each, fifteen squares, and one rule that decides everything: you can
                  only build outward from what you already hold. Read the board, starve the column
                  they want, and take the two that matter.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <Link href="/game" className="btn btn--key h-12 px-6">
                    Enter the arena
                  </Link>
                  <button type="button" onClick={() => setShowTutorial(true)} className="link">
                    Walk me through a turn
                  </button>
                </div>

                <p className="type-small mt-8 text-ink-3">
                  Campaign mode is not built yet. Online duels are.
                </p>
              </div>

              {/*
               * Offset downward on wide screens so the plate's top edge lands against
               * the body copy rather than the headline — the overlap is what stops
               * this reading as a two-column table.
               */}
              <div className="lg:col-span-5 lg:mt-16">
                <div className="border-rule border-ink bg-paper-raised">
                  <div className="px-6 pb-6 pt-6 sm:px-7">
                    <p className="type-label text-ink-3">Power score</p>
                    {loadingStats ? (
                      <Skeleton className="mt-3 h-[52px] w-28" />
                    ) : (
                      /*
                       * A number, so it is set in the mono and printed in the key
                       * plate. It was a 64px semi-bold serif in ember, which broke
                       * both halves of the type rule at once.
                       */
                      <p className="type-num mt-2 text-[56px] leading-none text-ink">
                        {lifetimeScore}
                      </p>
                    )}
                    <p className="type-small mt-3 max-w-[34ch] text-ink-2">
                      Earned one duel at a time. It only goes up when you win.
                    </p>
                  </div>

                  <div className="border-t-rule px-6 pb-7 pt-6 sm:px-7">
                    <p className="type-label text-ink-3">A finished board</p>
                    <BoardDiagram className="mt-4" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/*
           * The rules get a sheet of their own, so there is a band of table between
           * them and the hero doing the work a horizontal divider used to do.
           *
           * Each step is a number, a hairline and a paragraph — the number carries the
           * hierarchy, so none of them needs a box or an edge to read as a group. The
           * numerals are mono and in ink: ochre is the attention colour but it is a
           * fill and a rule only, and vermillion means "you", which a step number is
           * not.
           */}
          <section
            aria-labelledby="rules-heading"
            className="sheet mt-3 px-5 py-12 sm:mt-6 sm:px-10 sm:py-16 lg:px-14 lg:py-20"
          >
            <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h2 id="rules-heading" className="type-h1 text-ink">
                  How a duel goes
                </h2>
                <p className="type-small mt-4 max-w-[36ch] text-ink-2">
                  About four minutes, start to finish. There is no deck to build and nothing to
                  unlock — every match starts from the same five cards.
                </p>
              </div>

              <ol className="lg:col-span-8">
                {STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[auto_1fr] gap-x-6 border-t-hair py-7 first:border-t-0 first:pt-0"
                  >
                    <span className="type-num pt-[0.35rem] text-[0.9375rem] tracking-[0.08em] text-ink-3">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="type-h3 text-ink">{step.title}</h3>
                      <p className="type-body mt-2 text-ink-2">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/*
             * A colophon at the foot of the sheet rather than a footer band of its
             * own. There is nothing to put in a second bar, and inventing privacy and
             * terms pages to fill one would be inventing pages.
             */}
            <div className="mt-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t-heavy pt-6">
              <p className="type-small text-ink-3">
                Hand of Fate — a 1v1 card duel at{' '}
                <a
                  href="https://handoffate.org"
                  className="text-ink-2 underline decoration-ink-3 decoration-[1.5px] underline-offset-[3px] transition-colors duration-ink hover:text-ink hover:decoration-ink"
                >
                  handoffate.org
                </a>
              </p>
              <button type="button" onClick={() => setShowTutorial(true)} className="link">
                How to play
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
