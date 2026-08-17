// src/app/page.tsx
'use client';

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  Copy,
  Gem,
  LogOut,
  ScrollText,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth'
import { playerService, type PlayerDto } from '@/services/playerService'
import GuidedTutorial from '@/components/tutorial/GuidedTutorial'

const BASIC_RULES = [
  'Command a 3 column by 5 row battlefield',
  'Every card carries a power of 1, 3 or 5',
  'Place only next to a card you already own',
]

const VICTORY_RULES = [
  'Win more columns than your opponent',
  'A column goes to whoever has more power in it',
  'Equal power means the column goes to nobody',
]

export default function Home() {
  const { isAuthenticated, user, logout, isLoading } = useUnifiedAuth();
  const router = useRouter();
  const toast = useToast();
  const [playerData, setPlayerData] = useState<PlayerDto | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

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
        <Spinner size={18} className="text-arcane-300" />
        Awakening the magic…
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
    toast('Player ID copied', 'success');
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 h-16 border-b border-subtle backdrop-blur-md"
              style={{ backgroundColor: 'rgba(10,12,22,0.7)' }}>
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-lg font-bold text-gold-300 ring-2 ring-gold-400/50">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-lg font-semibold text-ink-hi">
                  {user?.username}
                </span>
                <Badge tone="gold">{rank}</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12px] text-ink-low tabular">
                  {user?.playerId?.slice(0, 8)}…
                </span>
                <button
                  type="button"
                  onClick={copyPlayerId}
                  aria-label="Copy your full player ID"
                  className="rounded-sm p-0.5 text-ink-low transition-colors duration-150 hover:text-ink-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400"
                >
                  <Copy size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={() => setShowTutorial(true)}>
              <BookOpen size={16} strokeWidth={1.75} />
              Redo Tutorial
            </Button>
            <Button variant="ghost" size="md" onClick={logout} className="hover:text-danger">
              <LogOut size={16} strokeWidth={1.75} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="text-center">
          <h1 className="text-gold-gradient font-display text-4xl font-bold tracking-[0.03em]">
            Hand of Fate
          </h1>
          <div className="rule-gold mx-auto mt-3 w-40" />
          <p className="mt-3 text-[15px] text-ink-mid">
            Master the arcane arts of strategic card placement
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Panel className="md:col-span-1">
            <PanelHeader
              icon={Trophy}
              title="Mystic Records"
              subtitle="Your journey through the realms"
            />
            <PanelBody>
              <div className="rounded-lg border bg-surface-2 p-6 text-center"
                   style={{ borderColor: 'rgba(217,174,78,0.35)' }}>
                <div className="type-micro text-ink-mid">Power Score</div>
                <div className="mt-2 font-display text-[40px] font-bold leading-none text-gold-300 tabular">
                  {loadingStats ? '—' : lifetimeScore}
                </div>
                <div className="type-small mt-2 text-ink-low">Mystical energy accumulated</div>
              </div>
              <p className="type-small mt-4 text-ink-low">
                Your power grows with every duel won. Climb the eternal rankings.
              </p>
            </PanelBody>
          </Panel>

          <Panel className="md:col-span-2">
            <PanelHeader icon={Swords} title="Enter the Arena" subtitle="Choose your path to glory" />
            <PanelBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  href="/game"
                  className="group flex flex-col rounded-lg border border-subtle bg-surface-2 p-5 transition-[transform,border-color,box-shadow] duration-200 ease-arcane hover:-translate-y-0.5 hover:border-gold-400/40 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400"
                >
                  <Swords size={24} strokeWidth={1.75} className="text-gold-400" />
                  <h3 className="type-h3 mt-3 text-ink-hi">Battle Mode</h3>
                  <p className="type-small mt-1 flex-1 text-ink-mid">
                    Challenge an opponent in a real-time card duel
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-300">
                    Enter Battle
                    <ArrowRight size={16} strokeWidth={1.75} className="transition-transform duration-200 ease-arcane group-hover:translate-x-0.5" />
                  </span>
                </Link>

                <div className="relative flex flex-col rounded-lg border border-subtle bg-surface-2 p-5 opacity-45">
                  <Badge tone="neutral" className="absolute right-4 top-4">
                    Coming Soon
                  </Badge>
                  <ScrollText size={24} strokeWidth={1.75} className="text-ink-mid" />
                  <h3 className="type-h3 mt-3 text-ink-hi">Campaign Mode</h3>
                  <p className="type-small mt-1 flex-1 text-ink-mid">
                    Uncover ancient secrets and master new spells
                  </p>
                </div>
              </div>
            </PanelBody>
          </Panel>

          <Panel className="md:col-span-3">
            <PanelHeader
              icon={ScrollText}
              title="Ancient Rules of Engagement"
              subtitle="Master these sacred principles"
            />
            <PanelBody>
              <div className="grid gap-6 md:grid-cols-2">
                <RuleList icon={Sparkles} title="Basic Principles" rules={BASIC_RULES} />
                <RuleList icon={Target} title="Victory Conditions" rules={VICTORY_RULES} />
              </div>
            </PanelBody>
          </Panel>
        </div>
      </main>
    </div>
  )
}

function RuleList({
  icon: Icon,
  title,
  rules,
}: {
  icon: typeof Sparkles
  title: string
  rules: string[]
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gold-300">
        <Icon size={14} strokeWidth={1.75} />
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {rules.map((rule) => (
          <li key={rule} className="flex items-start gap-2.5 text-sm leading-[1.6] text-ink-mid">
            <Gem size={14} strokeWidth={1.75} className="mt-[5px] shrink-0 text-arcane-300" />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  )
}
