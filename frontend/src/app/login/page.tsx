'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { InlineAlert } from '@/components/ui/inline-alert';
import { Spinner } from '@/components/ui/spinner';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { humanizeAuthError } from '@/lib/authErrors';
import { cn } from '@/lib/utils';
import GameTutorial from '@/components/tutorial/GameTutorial';

/*
 * The three cards, lying on the table beside the sheet.
 *
 * What was here before was a full-bleed panel of `battle-arena.png` — a glowing
 * indigo rune plate — with the form on a black half beside it. On bone paper that
 * is a lightbox stapled to a printed sheet, and there is no dark plate anywhere in
 * this design except the cards themselves. So the dark plate that stays is the one
 * that earns it: the shipped card faces, uncropped, laid on the walnut. Navy and
 * gold on wood is exactly where they belong, and they state the deck — one, three,
 * five — without a legend.
 *
 * The rotations reuse `.laid`, the same hand-laid device the board uses, so the
 * spread reads as three cards somebody put down rather than three images in a row.
 * Fixed values, not `Math.random`: this renders on the server too.
 */
const SPREAD = [
  { src: '/gifs/spark.png', rot: '-6.5deg', y: '12px' },
  { src: '/gifs/lightning.png', rot: '2deg', y: '-8px' },
  { src: '/gifs/thunder.png', rot: '6.5deg', y: '16px' },
];

function CardSpread() {
  return (
    <div aria-hidden className="hidden shrink-0 items-center lg:flex">
      {SPREAD.map(({ src, rot, y }) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={184}
          height={276}
          /* Whole faces, never cropped: each one is a complete printed object. */
          /*
           * The overlap stops short of the longest name. At -mr-10 the Thunder
           * card cut "LIGHTNING" mid-letter, which reads as a clipping bug
           * rather than as a fan of cards.
           */
          className="laid -mr-6 h-auto w-[144px] select-none last:mr-0 xl:-mr-7 xl:w-[184px]"
          style={{ '--lay-rot': rot, '--lay-y': y } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/**
 * A sheet on the table, with the keyline a card back is printed with inside it.
 *
 * The frame appears only once the sheet has an edge of its own to sit inside:
 * below `sm` the paper runs to all four sides of the screen, and a rule drawn
 * there is a box around the phone rather than around the printing.
 */
function SheetFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('sheet min-h-dvh w-full p-0 sm:min-h-0 sm:p-3', className)}>
      {/* Border colour comes from the global `* { border-color: var(--ink) }`. */}
      <div className="border-0 px-7 py-12 sm:border-hair sm:px-11 sm:py-12">{children}</div>
    </div>
  );
}

/**
 * A message that is not a correction: verified, sent, already registered.
 *
 * Deliberately not an `InlineAlert`. There is no success colour in this design and
 * inventing one here would put a third ink on the sheet to say "that worked" —
 * so it is a plain ruled note, and the errata slip stays reserved for errors.
 */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="border-hair bg-paper-raised px-3.5 py-2.5 font-mono text-[13px] leading-relaxed text-ink-2"
    >
      {children}
    </p>
  );
}

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  /** Shown instead of the hint, and announced. */
  error?: string;
}

/**
 * Label, field, and one line underneath — a hint, or an error in its place.
 *
 * All three are mono: a label, a hint and an error are apparatus, and the serif
 * has a 15px floor that none of them clear. The error is set in `--verm-deep`
 * rather than `--verm`, which is the only vermillion that carries small text.
 */
function FormField({ id, label, hint, error, ...input }: FormFieldProps) {
  const noteId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="type-label mb-2 block text-ink-2">
        {label}
      </label>
      <input
        id={id}
        className="field-input"
        aria-invalid={!!error}
        aria-describedby={noteId}
        {...input}
      />
      {error ? (
        <p id={noteId} role="alert" className="mt-2 font-mono text-[12px] leading-snug text-verm-deep">
          {error}
        </p>
      ) : (
        hint && (
          <p id={noteId} className="mt-2 font-mono text-[12px] leading-snug text-ink-3">
            {hint}
          </p>
        )
      )}
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
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-[600px] items-center px-0 sm:px-8 sm:py-12"
      >
        <SheetFrame>
          <p className="type-label text-ink-3">Setup</p>
          <h1 className="type-h1 mt-4 text-ink">Configuration required</h1>
          <p className="type-body mt-4 text-ink-2">
            Supabase credentials are needed before anyone can sign in.
          </p>
          {/* The step numbers are numbers, so the marker is set in the mono. */}
          <ol className="mt-7 list-decimal space-y-3 pl-6 marker:font-mono marker:text-[13px] marker:text-ink-3">
            <li className="type-small text-ink-2">
              Create a project at{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-verm-text underline decoration-verm underline-offset-[3px]"
              >
                supabase.com
              </a>
            </li>
            <li className="type-small text-ink-2">Copy the project URL and the anon key</li>
            <li className="type-small text-ink-2">
              Put them in{' '}
              <code className="border-hair bg-paper-raised px-1.5 py-0.5 font-mono text-[13px] text-ink">
                frontend/.env.local
              </code>
            </li>
          </ol>
        </SheetFrame>
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
        // Not a failure worth an errata slip — they have an account, they are just on
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
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-[600px] items-center px-0 sm:px-8 sm:py-12"
      >
        <SheetFrame>
          <p className="type-label text-verm-text">Verification sent</p>
          <h1 className="type-h1 mt-4 text-ink">Check your inbox</h1>
          <p className="type-body mt-4 text-ink-2">A verification link is on its way to</p>
          {/* The address is data, so it is set in the mono and boxed like a slug. */}
          <p className="mt-3 border-hair bg-paper-raised px-3.5 py-2.5 font-mono text-[13px] text-ink">
            {verificationEmail}
          </p>
          <p className="type-body mt-4 text-ink-2">
            Nothing yet? Look in the spam folder, or send it again.
          </p>

          {message && (
            <div className="mt-6">
              <Note>{message}</Note>
            </div>
          )}
          {error && <InlineAlert className="mt-6">{error}</InlineAlert>}

          <button
            type="button"
            /*
             * `disabled:text-paper` is a local repair: the shared `.btn:disabled`
             * drops the label to --ink-4, which on a key button's ink fill is
             * 2.4:1. A busy button still has to be readable.
             */
            className="btn btn--key mt-8 h-11 w-full px-5 disabled:border-ink disabled:text-paper"
            onClick={handleResendVerification}
            disabled={isLoading}
          >
            {isLoading && <Spinner size={15} />}
            {isLoading ? 'Sending…' : 'Send it again'}
          </button>

          <div className="mt-7">
            <button
              type="button"
              className="link"
              onClick={() => {
                setPendingVerification(false);
                setVerificationEmail('');
                setPassword('');
                setUsername('');
                setIsSignUp(false);
              }}
            >
              Back to sign in
            </button>
          </div>
        </SheetFrame>
      </main>
    );
  }

  return (
    <>
      {/*
       * One sheet, off to the left, with the cards on the table beside it. Not a
       * split screen: a split screen needs both halves to be surfaces, and here
       * only one of them is. The other half is furniture.
       */}
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-[1160px] items-center justify-center gap-8 px-0 sm:px-8 sm:py-12 lg:justify-between lg:px-10 xl:gap-14"
      >
        <SheetFrame className="sm:max-w-[560px]">
          <header>
            <h1 className="type-display text-ink">
              Hand of
              <br />
              Fate
            </h1>
            <hr className="mt-5 border-0 border-t-heavy border-t-ink" />
            <p className="type-body mt-5 text-ink-2">
              A real-time duel for two. Fifteen squares, five cards each, and every card
              you lay has to touch one you already own — take the most columns to win.
            </p>
            <p className="type-label mt-5 text-ink-3">3 columns · 5 rows · about 4 minutes</p>
          </header>

          <h2 className="type-h2 mt-12 text-ink">
            {isSignUp ? 'Create an account' : 'Sign in'}
          </h2>
          <p className="type-small mt-2 text-ink-2">
            {isSignUp
              ? 'One name, one address, and you are in the next duel.'
              : 'Your matches and score are waiting where you left them.'}
          </p>

          <form
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            noValidate
            className="mt-7 max-w-[400px] space-y-5"
          >
            {isSignUp && (
              <FormField
                id="username"
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="The name on the board"
                autoComplete="username"
                error={fieldErrors.username}
              />
            )}

            <FormField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              error={fieldErrors.email}
            />

            <FormField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              /* The hint below says the length; the placeholder saying it too is the
                 same sentence twice, and the placeholder is the copy that vanishes. */
              placeholder={isSignUp ? 'Choose a password' : 'Your password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              hint={isSignUp ? 'At least 6 characters' : undefined}
              error={fieldErrors.password}
            />

            {error && <InlineAlert>{error}</InlineAlert>}
            {message && <Note>{message}</Note>}

            <button
              type="submit"
              /* See the resend button: the shared disabled colour is unreadable on ink. */
              className="btn btn--key h-11 w-full px-5 disabled:border-ink disabled:text-paper"
              disabled={isLoading}
            >
              {isLoading && <Spinner size={15} />}
              {isLoading
                ? isSignUp
                  ? 'Creating…'
                  : 'Signing in…'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t-hair pt-6">
            <p className="type-small text-ink-2">
              {isSignUp ? 'Already have an account? ' : 'First time here? '}
              <button type="button" className="link" onClick={switchMode}>
                {isSignUp ? 'Sign in' : 'Make one'}
              </button>
            </p>

            <button
              type="button"
              className="btn btn--quiet h-9 px-3"
              onClick={() => setShowTutorial(true)}
            >
              How to play
            </button>
          </div>
        </SheetFrame>

        <CardSpread />
      </main>

      <GameTutorial
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        finishLabel="Got it"
      />
    </>
  );
}

export default function UnifiedAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="sheet px-8 py-6">
            <p className="type-label flex items-center gap-3 text-ink-3">
              <Spinner size={13} />
              Loading
            </p>
          </div>
        </div>
      }
    >
      <UnifiedAuthPageContent />
    </Suspense>
  );
}
