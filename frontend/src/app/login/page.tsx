'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, BookOpen, Mail } from 'lucide-react';

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

/*
 * The left half of the sign-in screen.
 *
 * The old page was a card in the dead centre of an otherwise empty viewport, which is
 * the most common shape an auth page can have. Splitting it gives the artwork somewhere
 * to live at full bleed and gives the form a left edge to align to, and it puts the one
 * thing a returning player wants — the door — on the side they read to.
 */
function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/backgrounds/battle-arena.png')",
          opacity: 0.55,
        }}
      />
      {/* Warm wash over the cold plate, so it belongs to the rest of the palette */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(155deg, rgba(12,11,10,0.3) 0%, rgba(12,11,10,0.72) 48%, rgba(12,11,10,0.96) 100%)',
        }}
      />
      {/* The seam between the two halves, lit */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-px"
        style={{
          background:
            'linear-gradient(180deg, transparent, rgba(217,142,67,0.35) 45%, transparent)',
        }}
      />

      <div className="relative">
        <Image
          src="/images/mystical-portal.png"
          alt=""
          width={64}
          height={64}
          priority
          style={{ filter: 'drop-shadow(0 0 28px rgba(92,147,186,0.45))' }}
        />
      </div>

      <div className="relative max-w-[30ch]">
        <h1 className="type-display text-ink-hi">
          Hand of
          <br />
          <span className="text-ember-gradient">Fate</span>
        </h1>
        <p className="type-body mt-6 text-ink-mid">
          Fifteen squares, five cards, and one opponent deciding at the same moment you
          are. Win two columns of three.
        </p>
      </div>

      <p className="type-label relative text-ink-low">
        Three columns · five rows · about four minutes
      </p>
    </section>
  );
}

function UnifiedAuthPageContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    } else if (searchParams.get('expired') === '1') {
      setError('Your session expired. Sign in again to pick up where you left off.');
    }
  }, [searchParams]);

  if (!isSupabaseConfigured) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center p-6">
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
                className="text-ember-300 underline-offset-4 hover:underline"
              >
                supabase.com
              </a>
            </li>
            <li>Copy the project URL and the anon key</li>
            <li>
              Put them in{' '}
              <code className="rounded-xs bg-surface-2 px-1.5 py-0.5">frontend/.env.local</code>
            </li>
          </ol>
        </Panel>
      </main>
    );
  }

  /**
   * Checks the form before it goes anywhere.
   *
   * Returns per-field messages rather than one banner. A single red box at the top
   * saying "Fill in every field to continue" makes the reader work out which field it
   * means; a line under the empty one does not.
   */
  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};

    if (isSignUp && !username.trim()) {
      next.username = 'Pick a name other players will see.';
    }
    if (!email.trim()) {
      next.email = 'Enter the address you signed up with.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'That does not look like an email address.';
    }
    if (!password) {
      next.password = 'Enter your password.';
    } else if (isSignUp && password.length < 6) {
      next.password = 'Use at least 6 characters.';
    }

    return next;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const problems = validate();
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

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

    const problems = validate();
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

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

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setMessage('');
    setFieldErrors({});
    setPassword('');
    if (!isSignUp) setUsername('');
  };

  if (pendingVerification) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center p-6">
        <Panel className="w-full max-w-[420px] p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ember-400/10 ring-1 ring-inset ring-ember-400/30">
            <Mail size={20} strokeWidth={1.75} className="text-ember-300" />
          </div>
          <h1 className="type-h2 mt-5 text-ink-hi">Check your inbox</h1>
          <p className="type-small mt-2 text-ink-mid">
            A verification link is on its way to{' '}
            <span className="text-ink-hi">{verificationEmail}</span>. Nothing yet? Look in the
            spam folder, or send it again.
          </p>

          {message && (
            <InlineAlert tone="success" className="mt-5">
              {message}
            </InlineAlert>
          )}
          {error && (
            <InlineAlert tone="danger" className="mt-5">
              {error}
            </InlineAlert>
          )}

          <Button
            variant="primary"
            size="lg"
            className="mt-7 w-full"
            onClick={handleResendVerification}
            disabled={isLoading}
          >
            {isLoading && <Spinner size={16} />}
            {isLoading ? 'Sending…' : 'Send it again'}
          </Button>

          <div className="mt-5 text-center">
            <Button
              variant="link"
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
          </div>
        </Panel>
      </main>
    );
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[1.15fr_1fr]">
      <BrandPanel />

      {/*
        * The form half gets its own opaque ground. The shared background is deliberately
        * faint, but "faint artwork behind a password field" is still artwork behind a
        * password field — and the split only reads as a split if one side is picture and
        * the other is paper.
        */}
      <main
        id="main"
        className="relative flex items-center justify-center px-6 py-14"
        style={{ backgroundColor: '#0C0B0A' }}
      >
        <div className="w-full max-w-[380px]">
          {/* The wordmark only appears here when the panel beside it is not on screen. */}
          <div className="mb-10 lg:hidden">
            <Image
              src="/images/mystical-portal.png"
              alt=""
              width={52}
              height={52}
              priority
              style={{ filter: 'drop-shadow(0 0 22px rgba(92,147,186,0.4))' }}
            />
            <h1 className="type-h1 mt-5 text-ink-hi">
              Hand of <span className="text-ember-gradient">Fate</span>
            </h1>
          </div>

          <h2 className="type-h1 text-ink-hi">
            {isSignUp ? 'Make an account' : 'Sign in'}
          </h2>
          <p className="type-small mt-2 text-ink-low">
            {isSignUp
              ? 'One name, one address, and you are in the next duel.'
              : 'Your matches and score are waiting where you left them.'}
          </p>

          <form
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            noValidate
            className="mt-8 space-y-5"
          >
            {isSignUp && (
              <Field label="Username" htmlFor="username" error={fieldErrors.username}>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="The name on the board"
                  autoComplete="username"
                  aria-invalid={!!fieldErrors.username}
                />
              </Field>
            )}

            <Field label="Email" htmlFor="email" error={fieldErrors.email}>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              hint={isSignUp ? 'At least 6 characters' : undefined}
              error={fieldErrors.password}
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                aria-invalid={!!fieldErrors.password}
              />
            </Field>

            {error && <InlineAlert tone="danger">{error}</InlineAlert>}
            {message && <InlineAlert tone="success">{message}</InlineAlert>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Spinner size={16} />}
              {isLoading
                ? isSignUp
                  ? 'Creating…'
                  : 'Signing in…'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
              {!isLoading && <ArrowRight size={18} strokeWidth={1.75} />}
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-subtle pt-6">
            <p className="type-small text-ink-low">
              {isSignUp ? 'Already have an account? ' : 'First time here? '}
              <Button variant="link" size="sm" onClick={switchMode}>
                {isSignUp ? 'Sign in' : 'Make one'}
              </Button>
            </p>

            <Button variant="ghost" size="sm" onClick={() => setShowTutorial(true)}>
              <BookOpen size={15} strokeWidth={1.75} />
              How to play
            </Button>
          </div>
        </div>
      </main>

      <GameTutorial
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        finishLabel="Got it"
      />
    </div>
  );
}

export default function UnifiedAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner size={26} className="text-ember-300" />
        </div>
      }
    >
      <UnifiedAuthPageContent />
    </Suspense>
  );
}
