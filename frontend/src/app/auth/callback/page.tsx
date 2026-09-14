'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { unifiedAuthService } from '@/services/unifiedAuthService'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Spinner } from '@/components/ui/spinner'

export default function AuthCallback() {
  const router = useRouter()
  const [message, setMessage] = useState('Verifying your account…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Handling auth callback...')

        // Check for error in URL hash
        const hash = window.location.hash
        if (hash.includes('error=')) {
          const params = new URLSearchParams(hash.substring(1))
          const errorCode = params.get('error_code')
          const errorDescription = params.get('error_description')

          if (errorCode === 'otp_expired') {
            setError('That verification link has expired. Sign up again, or ask for a new verification email.')
          } else {
            setError(errorDescription || 'Verification failed')
          }
          setTimeout(() => router.push('/login'), 5000)
          return
        }

        // Get the current Supabase session
        const { user, session } = await unifiedAuthService.getCurrentSession()

        if (!user || !session) {
          setError('No sign-in session found. Open the link from your email again.')
          setTimeout(() => router.push('/login'), 3000)
          return
        }

        console.log('Session found, user:', user.id, 'email confirmed:', user.email_confirmed_at)

        if (!user.email_confirmed_at) {
          setError('This email is not verified yet.')
          setTimeout(() => router.push('/login'), 3000)
          return
        }

        setMessage('Email verified. Setting up your account…')

        // Sync user to backend (creates Player and Nakama account)
        const syncResult = await unifiedAuthService.syncUserToBackend(user)

        if (syncResult.isSuccess) {
          setMessage('Your account is ready. Taking you to sign-in…')
          // Redirect to login with success message
          setTimeout(() => {
            router.push('/login?verified=true')
          }, 2000)
        } else {
          setError('Could not finish setting up your account: ' + syncResult.message)
          setTimeout(() => router.push('/login'), 5000)
        }
      } catch (err: any) {
        console.error('Callback handling error:', err)
        setError(`Verification failed: ${err.message || 'unknown error'}`)
        setTimeout(() => router.push('/login'), 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  /*
   * One small panel on the centre line, and nothing else in the firmament. This
   * page is a waiting room between the email and the sign-in form — it has one
   * line of status and no decisions to offer, so it gets the least of any screen
   * in the application: no wordmark, no gilded control, no deck at its foot.
   */
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-[520px] items-center px-4 py-10 sm:px-8 sm:py-14"
    >
      <div className="panel w-full px-6 pb-11 pt-12 text-center sm:px-11 sm:pt-12">
        <p className="type-label text-gold">Account setup</p>
        <h1 className="type-h2 mt-4 text-parchment">
          {error ? 'Verification failed' : 'Verifying your account'}
        </h1>

        {error ? (
          <InlineAlert className="mt-7 text-left">{error}</InlineAlert>
        ) : (
          /*
           * The one loop the design allows, and this is the case it was kept for:
           * the honest answer here is that we are still waiting.
           */
          <div className="mt-7 flex items-center justify-center gap-3 border-hair border-gold-deep bg-night-2 px-3.5 py-3">
            <Spinner size={14} className="shrink-0 text-parchment-3" />
            <p role="status" className="text-[0.9375rem] leading-relaxed text-parchment-2">
              {message}
            </p>
          </div>
        )}

        <p className="type-small mt-7 text-parchment-3">
          {error ? 'Taking you back to the sign-in page…' : 'This takes a moment.'}
        </p>
      </div>
    </main>
  )
}
