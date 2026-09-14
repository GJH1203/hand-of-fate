// src/app/page.tsx
'use client';

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, Check, Copy, LogOut } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
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
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-ink-mid">
        <Spinner size={18} className="text-ember-300" />
        Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (showTutorial && user?.playerId) {
    return (
      <GuidedTutorial
        playerName={user.username || 'Apprentice'}
        onComplete={finishTutorial}
        onSkip={finishTutorial}
      />
    );
  }

  // There is no rank in PlayerDto yet — the badge has always read "Apprentice" for
  // everyone, and saying so here is better than dressing a constant up as data.
  const rank = 'Apprentice';
  const lifetimeScore = playerData?.lifetimeScore ?? 0;
  const initial = (user?.username || '?').charAt(0).toUpperCase();

  const copyPlayerId = async () => {
    if (!user?.playerId) return;
    await navigator.clipboard.writeText(user.playerId);
    setCopied(true);
    toast('Player ID copied', 'success');
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-sticky border-b border-subtle bg-surface-0/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-3">
            {/*
             * A squircle rather than a circle. Circular avatars are the single most
             * universal component default there is, and this one sits next to a board
             * made entirely of rounded squares — it should match the board.
             */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-ember-400/[0.12] font-ui text-[15px] font-bold text-ember-300 ring-1 ring-inset ring-ember-400/35">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-hi">
                  {user?.username}
                </span>
                <Badge tone="ember">{rank}</Badge>
              </div>
              <button
                type="button"
                onClick={copyPlayerId}
                aria-label="Copy your full player ID"
                className="group -ml-0.5 flex items-center gap-1.5 rounded-xs px-0.5 text-[12px] text-ink-low transition-colors duration-200 hover:text-ink-mid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400"
              >
                <span className="tabular">{user?.playerId?.slice(0, 8)}…</span>
                {copied ? (
                  <Check size={13} strokeWidth={2} className="text-success" />
                ) : (
                  <Copy size={13} strokeWidth={1.75} className="opacity-60 group-hover:opacity-100" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="md" onClick={() => setShowTutorial(true)}>
              <BookOpen size={16} strokeWidth={1.75} />
              Tutorial
            </Button>
            <Button variant="ghost" size="md" onClick={logout} className="hover:text-danger">
              <LogOut size={16} strokeWidth={1.75} />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1180px] px-6">
        {/*
         * The hero is a 12-column grid split 7/5 rather than a centred stack, and the
         * stat plate on the right is pulled up past the headline's baseline so the two
         * halves interlock instead of sitting in two tidy boxes. Everything in the
         * left column is left-aligned to one edge; the old page centred five separate
         * elements and the eye had nowhere to rest.
         */}
        <section className="grid grid-cols-1 items-start gap-10 pb-20 pt-16 lg:grid-cols-12 lg:gap-12 lg:pb-28 lg:pt-24">
          <div className="stagger lg:col-span-7">
            <p className="type-label text-ember-400">Real-time · one against one</p>

            <h1 className="type-display mt-4 text-ink-hi">
              Three columns.
              <br />
              <span className="text-ember-gradient">Take two.</span>
            </h1>

            <p className="type-body mt-6 text-ink-mid">
              Five cards each, fifteen squares, and one rule that decides everything: you can
              only build outward from what you already hold. Read the board, starve the column
              they want, and take the two that matter.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Button asChild variant="primary" size="lg">
                <Link href="/game">
                  Enter the arena
                  <ArrowRight size={18} strokeWidth={1.75} />
                </Link>
              </Button>
              <Button variant="link" onClick={() => setShowTutorial(true)}>
                Walk me through a turn
              </Button>
            </div>

            <p className="type-small mt-8 text-ink-low">
              Campaign mode is not built yet. Online duels are.
            </p>
          </div>

          {/*
           * Offset downward on wide screens so the plate's top edge lands against the
           * body copy rather than the headline — the overlap is what stops this reading
           * as a two-column table.
           */}
          <div className="lg:col-span-5 lg:mt-14">
            <Panel tone="raised" className="overflow-hidden p-0">
              <div className="relative px-7 pb-7 pt-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(217,142,67,0.16) 0%, transparent 68%)',
                  }}
                />
                <p className="type-label relative text-ink-low">Power score</p>
                {loadingStats ? (
                  <Skeleton className="relative mt-3 h-[58px] w-32" />
                ) : (
                  <p className="relative mt-2 text-[64px] font-bold leading-none tracking-[-0.04em] text-ember-300 tabular">
                    {lifetimeScore}
                  </p>
                )}
                <p className="type-small relative mt-3 max-w-[34ch] text-ink-low">
                  Earned one duel at a time. It only goes up when you win.
                </p>
              </div>

              {/*
                * Caption under the diagram rather than beside it. Beside it, the text got
                * a 15-character measure and ragged into six lines; the board is narrow
                * enough that the plate can afford the vertical space instead.
                */}
              <div className="border-t border-subtle px-7 pb-7 pt-6">
                <p className="type-label text-ink-low">A finished board</p>
                <BoardDiagram className="mt-4" />
                <p className="type-small mt-4 text-ink-mid">
                  Ember took the left column 8 to 1 and the right 6 to 5. Two of three is the
                  match — the middle one never mattered.
                </p>
              </div>
            </Panel>
          </div>
        </section>

        {/*
         * The rules, as a zig-zag rather than a row of equal cards. Each step is a
         * number, a hairline and a paragraph — the number carries the hierarchy, so
         * none of them needs a box, a border or a shadow to be legible as a group.
         */}
        <section aria-labelledby="rules-heading" className="border-t border-subtle py-16 lg:py-24">
          <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 id="rules-heading" className="type-h1 text-ink-hi">
                How a duel goes
              </h2>
              <p className="type-small mt-4 max-w-[36ch] text-ink-low">
                About four minutes, start to finish. There is no deck to build and nothing to
                unlock — every match starts from the same five cards.
              </p>
            </div>

            <ol className="lg:col-span-8">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-subtle py-7 first:border-t-0 first:pt-0"
                >
                  <span className="type-label pt-1 text-ember-400 tabular">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="type-h3 text-ink-hi">{step.title}</h3>
                    <p className="type-body mt-2 text-ink-mid">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-subtle">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <p className="type-small text-ink-low">
            Hand of Fate — a 1v1 card duel at{' '}
            <a
              href="https://handoffate.org"
              className="text-ink-mid underline-offset-4 transition-colors duration-200 hover:text-ember-300 hover:underline"
            >
              handoffate.org
            </a>
          </p>
          <Button variant="link" size="sm" onClick={() => setShowTutorial(true)}>
            How to play
          </Button>
        </div>
      </footer>
    </div>
  )
}
