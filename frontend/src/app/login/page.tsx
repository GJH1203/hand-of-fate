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
 * The predella: the three cards, laid in a fan under the panel.
 *
 * An altarpiece has a strip of small painted panels along its foot, and that is
 * exactly the job these do — they state the deck, one, three and five, without a
 * legend, beneath the thing you actually came here to use.
 *
 * They are the shipped card faces, whole and uncropped: navy grounds with gold
 * keylines, serif capitals and big numerals. That gold is this gold, which makes
 * them the single best-matched asset the design has, and cropping a complete
 * printed object into a texture would throw away the only reason to show it.
 *
 * The fan is MIRRORED about the centre card, because this design is axial. The
 * previous pass raked all three the same way and slid them under each other; at
 * that overlap the Thunder card cut "LIGHTNING" mid-letter, which reads as a
 * clipping bug rather than as a fan, so they now stand clear of one another.
 *
 * The rotations are fixed values and not `Math.random`: this renders on the
 * server too, and React pulls the tree down over a style attribute that differs.
 */
const SPREAD = [
  { src: '/gifs/spark.png', rot: '-7deg', y: '18px' },
  { src: '/gifs/lightning.png', rot: '0deg', y: '0px' },
  { src: '/gifs/thunder.png', rot: '7deg', y: '18px' },
];

function CardFan() {
  return (
    /*
     * The fan is tucked UNDER the panel's lower edge rather than set below it.
     * Stacked, the panel and a full-height fan are taller than a laptop viewport
     * and the cards fell off the fold — decoration nobody ever saw. Overlapping
     * them costs ~90px, and it is also what it would actually look like: three
     * cards lying on the table with the panel standing on top of them.
     */
    <div
      aria-hidden
      className="-mt-16 hidden shrink-0 items-start justify-center gap-3 md:flex"
    >
      {SPREAD.map(({ src, rot, y }) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={184}
          height={276}
          className="laid h-auto w-[104px] select-none xl:w-[120px]"
          style={{ '--lay-rot': rot, '--lay-y': y } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/**
 * The panel: a night board with a gilt frame and a round head.
 *
 * The head is why the top padding is as deep as it is. `.panel--arched` cuts the
 * arch as a share of the panel's own height, so on a tall panel the border
 * sweeps a long way down at the left and right shoulders — anything set too
 * close to the top there passes outside the frame. The space it leaves is the
 * tympanum, and the wordmark standing in it is the point of the shape.
 */
function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'panel w-full px-6 pb-11 pt-12 text-center sm:px-12 sm:pb-12 sm:pt-14',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The wordmark, inscribed, with a nimbus around it.
 *
 * The rings are drawn — two concentric gilt rules at `.aureole`, never a blur —
 * and they take the arch of the panel above them, so the title reads as a figure
 * standing in a niche rather than as text in a box. That is what an arch is for
 * here and it is the only place on this screen that earns one.
 */
function Wordmark() {
  return (
    <h1 className="type-display text-gold-lit">
      <span className="aureole inline-block rounded-arch px-5 pb-2 pt-4 sm:px-8">
        Hand of
        <br />
        Fate
      </span>
    </h1>
  );
}

/**
 * A message that is not a correction: verified, sent, already registered.
 *
 * Deliberately not an `InlineAlert`. There is no success colour in this design and
 * inventing one here would put a third ink on the panel to say "that worked" — so
 * it is a plain ruled note on a raised ground, and cinnabar stays reserved for the
 * things a rubric is actually for.
 */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="border-hair border-gold-deep bg-night-2 px-3.5 py-2.5 text-left text-[0.9375rem] leading-relaxed text-parchment-2"
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
 * The label is inscriptional: Marcellus capitals with open tracking, which is what
 * `.type-label` cuts. Everything else here is prose and prose is Spectral.
 *
 * THE ERROR IS MARKED IN CINNABAR AND WRITTEN IN PARCHMENT, and that split is the
 * point. Red in a manuscript is an index rather than an emotion — it tells you
 * where to look, and the words tell you what is wrong. Setting the sentence itself
 * in cinnabar would put it at 3.9:1 on the night, which is under the floor for
 * text this size; the rule down its edge carries the same signal at full strength
 * and costs the reader nothing.
 */
function FormField({ id, label, hint, error, ...input }: FormFieldProps) {
  const noteId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="text-left">
      <label htmlFor={id} className="type-label mb-2 block text-parchment-2">
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
        <p
          id={noteId}
          role="alert"
          className="mt-2 border-l-rule border-l-cinnabar pl-2.5 text-[0.8125rem] leading-snug text-parchment"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p id={noteId} className="mt-2 text-[0.8125rem] leading-snug text-parchment-3">
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
        className="mx-auto flex min-h-dvh w-full max-w-[600px] items-center px-4 py-10 sm:px-8 sm:py-14"
      >
        <Panel className="pt-14 sm:pt-16">
          <p className="type-label text-gold">Setup</p>
          <h1 className="type-h1 mt-4 text-parchment">Configuration required</h1>
          <p className="type-body mx-auto mt-5 text-parchment-2">
            Supabase credentials are needed before anyone can sign in.
          </p>
          {/* The steps are read in order, so they are set left and read down the
              left edge. The markers are numerals and every numeral in this game is
              Spectral, which is what the list items are already set in. */}
          <ol className="mx-auto mt-8 max-w-[380px] list-decimal space-y-3 pl-6 text-left marker:text-[0.8125rem] marker:text-gold">
            <li className="type-small text-parchment-2">
              Create a project at{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-gold-lit underline decoration-gold-deep underline-offset-[3px]"
              >
                supabase.com
              </a>
            </li>
            <li className="type-small text-parchment-2">Copy the project URL and the anon key</li>
            <li className="type-small text-parchment-2">
              Put them in{' '}
              {/* `font-text` on purpose: the browser sets `code` in a monospace and
                  this design has two faces, neither of them one. */}
              <code className="border-hair border-gold-deep bg-night-2 px-1.5 py-0.5 font-text text-[0.9375rem] text-parchment">
                frontend/.env.local
              </code>
            </li>
          </ol>
        </Panel>
      </main>
    );
  }

  /**
   * Checks the form before it goes anywhere.
   *
   * Returns per-field messages rather than one banner. A single box at the top saying
   * "Fill in every field to continue" makes the reader work out which field it means;
   * a line under the empty one does not.
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
        // Not a failure worth a rubric — they have an account, they are just on the
        // wrong form. Send them to the other one with the address kept.
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
        className="mx-auto flex min-h-dvh w-full max-w-[560px] items-center px-4 py-10 sm:px-8 sm:py-14"
      >
        <Panel className="pt-14 sm:pt-16">
          <p className="type-label text-gold">Verification sent</p>
          <h1 className="type-h1 mt-4 text-parchment">Check your inbox</h1>
          <p className="type-body mx-auto mt-5 text-parchment-2">
            A verification link is on its way to
          </p>
          {/* The address is data, so it is set apart on a raised ground the way a
              room code is — read, not written. */}
          <p className="mx-auto mt-4 max-w-[400px] border-hair border-gold-deep bg-night-2 px-3.5 py-2.5 text-[0.9375rem] text-parchment">
            {verificationEmail}
          </p>
          <p className="type-body mx-auto mt-5 text-parchment-2">
            Nothing yet? Look in the spam folder, or send it again.
          </p>

          {message && (
            <div className="mx-auto mt-7 max-w-[400px]">
              <Note>{message}</Note>
            </div>
          )}
          {error && (
            <InlineAlert className="mx-auto mt-7 max-w-[400px] text-left">{error}</InlineAlert>
          )}

          {/* The one gilded control on this screen. Gold is light here, not a
              colour, and spending it twice would spend it on nothing. */}
          <button
            type="button"
            className="btn btn--key mx-auto mt-9 h-12 w-full max-w-[400px] px-6"
            onClick={handleResendVerification}
            disabled={isLoading}
          >
            {isLoading && <Spinner size={15} />}
            {isLoading ? 'Sending…' : 'Send it again'}
          </button>

          <div className="mt-8">
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
        </Panel>
      </main>
    );
  }

  return (
    <>
      {/*
       * One panel on the centre line, with the deck laid at its foot. Not a split
       * screen: a split screen has an axis running down the gap between its halves,
       * and this design puts the axis through the middle of the thing itself.
       */}
      <main
        id="main"
        className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col items-center justify-center px-4 py-10 sm:px-8 sm:py-14"
      >
        <Panel className="relative z-raised max-w-[540px]">
          <header>
            <Wordmark />

            <div aria-hidden className="mx-auto mt-7 h-[2px] w-24 bg-gold" />

            <p className="type-body mx-auto mt-5 text-parchment-2">
              A real-time duel for two. Fifteen squares, five cards each, and every card
              you lay has to touch one you already own — take the most columns to win.
            </p>

            {/*
             * An almanac line. The counts are spelled out rather than set as
             * numerals because this is Marcellus, and every numeral in this game
             * belongs to Spectral without exception.
             */}
            <p className="type-label interpunct mt-5 flex flex-wrap items-center justify-center text-parchment-3">
              <span>Three columns</span>
              <span>Five rows</span>
              <span>Four minutes</span>
            </p>
          </header>

          {/*
           * The heading carries the whole job. There used to be a line under it
           * saying "Your matches and score are waiting where you left them." — a
           * sentence with no information in it, sitting directly beneath a
           * paragraph that had already described the game, on a panel that then
           * did not fit a laptop viewport. Two descriptions above one form is one
           * too many.
           */}
          <h2 className="type-h2 mt-11 text-parchment">
            {isSignUp ? 'Create an account' : 'Sign in'}
          </h2>

          {/*
           * The ceremony above is centred; the form is a column you read down its
           * left edge. Centring a 12px label over a 400px field leaves it floating
           * with nothing to align to, and a centred error is harder to scan than a
           * left one — so the block is on the axis and its contents are not.
           */}
          <form
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            noValidate
            className="mx-auto mt-8 max-w-[400px] space-y-5"
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

            {error && <InlineAlert className="text-left">{error}</InlineAlert>}
            {message && <Note>{message}</Note>}

            {/* The one gilded control on the screen. */}
            <button type="submit" className="btn btn--key h-12 w-full px-6" disabled={isLoading}>
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

          <div className="mx-auto mt-10 flex max-w-[400px] flex-wrap items-center justify-center gap-x-7 gap-y-4 border-t-hair border-t-gold-deep pt-7">
            <p className="type-small text-parchment-2">
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
        </Panel>

        <CardFan />
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
          <div className="panel px-8 py-6">
            <p className="type-label flex items-center gap-3 text-parchment-3">
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
