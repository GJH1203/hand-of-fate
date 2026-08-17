'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { BookOpen, Lock, Mail, ShieldCheck, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Panel } from '@/components/ui/panel';
import { Spinner } from '@/components/ui/spinner';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { humanizeAuthError } from '@/lib/authErrors';
import GameTutorial from '@/components/tutorial/GameTutorial';

/** The two card silhouettes drifting behind the form. Decoration, kept quiet. */
function DriftingCards() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
      <div
        className="absolute left-[14%] top-[22%] h-40 w-28 rounded-lg border border-gold-400 bg-surface-2"
        style={{ transform: 'rotate(-11deg)', animation: 'drift 14s ease-in-out infinite' }}
      />
      <div
        className="absolute right-[13%] bottom-[20%] h-40 w-28 rounded-lg border border-gold-400 bg-surface-2"
        style={{
          transform: 'rotate(9deg)',
          animation: 'drift 17s ease-in-out infinite',
          animationDelay: '2.5s',
        }}
      />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="mb-8 text-center">
      <Image
        src="/images/mystical-portal.png"
        alt=""
        width={96}
        height={96}
        priority
        className="mx-auto"
        style={{ filter: 'drop-shadow(0 0 24px rgba(86,140,230,0.35))' }}
      />
      <h1 className="type-display text-gold-gradient mt-5">HAND OF FATE</h1>
      <div className="rule-gold mx-auto mt-4 w-40" />
      <p className="mt-3 text-[15px] text-ink-mid">Embrace Your Mystical Destiny</p>
    </div>
  );
}

function UnifiedAuthPageContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin, isAuthenticated } = useUnifiedAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setMessage('Email verified. You can sign in now.');
      setIsSignUp(false);
    }
  }, [searchParams]);

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Panel className="w-full max-w-md p-8">
          <h1 className="type-h2 text-ink-hi">Configuration required</h1>
          <p className="type-small mt-2 text-ink-low">
            Supabase credentials are needed before anyone can sign in.
          </p>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-ink-mid">
            <li>
              Create a project at{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-arcane-300 hover:underline"
              >
                supabase.com
              </a>
            </li>
            <li>Copy the project URL and the anon key</li>
            <li>
              Put them in <code className="rounded bg-surface-2 px-1.5 py-0.5">frontend/.env.local</code>
            </li>
          </ol>
        </Panel>
      </main>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password || !username) {
      setError('Fill in every field to continue.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await unifiedAuthService.signUp(email, password, username);

      if (result.alreadyRegistered) {
        // Not a failure worth a red banner — they have an account, they are just on
        // the wrong form. Send them to the other one with the address kept.
        setIsSignUp(false);
        setPassword('');
        setMessage('That email already has an account. Sign in below.');
      } else if (!result.success) {
        setError(humanizeAuthError(result.error));
      } else if (result.needsEmailVerification) {
        setPendingVerification(true);
        setVerificationEmail(email);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(humanizeAuthError(err?.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password) {
      setError('Fill in every field to continue.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await unifiedAuthService.signIn(email, password);
      if (!result.success) {
        setError(humanizeAuthError(result.error));
      } else if (result.data) {
        authLogin(result.data);
        // The redirect happens in the effect above once isAuthenticated flips.
      }
    } catch (err: any) {
      setError(humanizeAuthError(err?.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;

    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await unifiedAuthService.resendVerification(verificationEmail);
      if (result.error) {
        setError(humanizeAuthError(result.error.message));
      } else {
        setMessage('Verification email sent. Check your inbox.');
      }
    } catch {
      setError(humanizeAuthError(null));
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center p-4">
        <DriftingCards />
        <Panel className="relative z-10 w-full max-w-[420px] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-400/40 bg-gold-400/10">
            <Mail size={22} strokeWidth={1.75} className="text-gold-300" />
          </div>
          <h1 className="type-h2 mt-5 text-ink-hi">Check your inbox</h1>
          <p className="type-small mt-2 text-ink-low">
            A verification link is on its way to {verificationEmail}.
          </p>

          {message && (
            <InlineAlert tone="success" className="mt-5 text-left">
              {message}
            </InlineAlert>
          )}
          {error && (
            <InlineAlert tone="danger" className="mt-5 text-left">
              {error}
            </InlineAlert>
          )}

          <p className="type-small mt-6 text-ink-mid">
            Nothing yet? Check the spam folder, or send it again.
          </p>

          <Button
            variant="primary"
            size="lg"
            className="mt-4 w-full"
            onClick={handleResendVerification}
            disabled={isLoading}
          >
            {isLoading && <Spinner size={16} />}
            {isLoading ? 'Sending…' : 'Resend verification email'}
          </Button>

          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => {
              setPendingVerification(false);
              setVerificationEmail('');
              setPassword('');
              setUsername('');
              setIsSignUp(false);
            }}
          >
            Back to sign in
          </Button>
        </Panel>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4 py-10">
      <DriftingCards />

      <div className="relative z-10 w-full max-w-[420px]">
        <BrandMark />

        <Panel className="p-8">
          <div className="text-center">
            <h2 className="type-h2 text-ink-hi">
              {isSignUp ? 'Begin Your Journey' : 'Return to the Realm'}
            </h2>
            <p className="type-small mt-1 text-ink-low">
              {isSignUp ? 'Create your destiny in the realm' : 'Your cards await your return'}
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="mt-7 space-y-4">
            {isSignUp && (
              <Field label="Username" htmlFor="username" icon={User}>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  autoComplete="username"
                  required
                />
              </Field>
            )}

            <Field label="Email" htmlFor="email" icon={Mail}>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              icon={Lock}
              hint={isSignUp ? 'Must be at least 6 characters' : undefined}
              hintIcon={ShieldCheck}
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Minimum 6 characters' : 'Enter your password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
            </Field>

            {error && <InlineAlert tone="danger">{error}</InlineAlert>}
            {message && <InlineAlert tone="success">{message}</InlineAlert>}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
              {isLoading && <Spinner size={16} />}
              {isLoading
                ? isSignUp
                  ? 'Forging…'
                  : 'Entering…'
                : isSignUp
                  ? 'Forge Your Destiny'
                  : 'Enter the Realm'}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="type-small text-ink-low">
              {isSignUp ? 'Already have powers? ' : 'New to this realm? '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                  setPassword('');
                  if (!isSignUp) setUsername('');
                }}
                className="rounded-sm text-arcane-300 transition-colors duration-150 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400"
              >
                {isSignUp ? 'Sign in to your realm' : 'Begin your mystical journey'}
              </button>
            </p>

            <Button variant="ghost" size="md" onClick={() => setShowTutorial(true)}>
              <BookOpen size={16} strokeWidth={1.75} />
              How to Play
            </Button>
          </div>
        </Panel>
      </div>

      <GameTutorial
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        finishLabel="Got it"
      />
    </main>
  );
}

export default function UnifiedAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner size={28} className="text-arcane-300" />
        </div>
      }
    >
      <UnifiedAuthPageContent />
    </Suspense>
  );
}
