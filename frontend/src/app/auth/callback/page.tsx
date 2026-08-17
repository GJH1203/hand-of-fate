'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { unifiedAuthService } from '@/services/unifiedAuthService'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Panel, PanelBody } from '@/components/ui/panel'
import { Spinner } from '@/components/ui/spinner'

export default function AuthCallback() {
  const router = useRouter()
  const [message, setMessage] = useState('Verifying your account...')
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
            setError('Verification link has expired. Please sign up again or request a new verification email.')
          } else {
            setError(errorDescription || 'Verification failed')
          }
          setTimeout(() => router.push('/login'), 5000)
          return
        }
        
        // Get the current Supabase session
        const { user, session } = await unifiedAuthService.getCurrentSession()
        
        if (!user || !session) {
          setError('No authentication session found')
          setTimeout(() => router.push('/login'), 3000)
          return
        }

        console.log('Session found, user:', user.id, 'email confirmed:', user.email_confirmed_at)
        
        if (!user.email_confirmed_at) {
          setError('Email not verified yet')
          setTimeout(() => router.push('/login'), 3000)
          return
        }

        setMessage('Email verified successfully! Setting up your account...')

        // Sync user to backend (creates Player and Nakama account)
        const syncResult = await unifiedAuthService.syncUserToBackend(user)
        
        if (syncResult.isSuccess) {
          setMessage('Account setup complete! Redirecting to login...')
          // Redirect to login with success message
          setTimeout(() => {
            router.push('/login?verified=true')
          }, 2000)
        } else {
          setError('Failed to complete account setup: ' + syncResult.message)
          setTimeout(() => router.push('/login'), 5000)
        }
      } catch (err: any) {
        console.error('Callback handling error:', err)
        setError(`Callback error: ${err.message || 'Unknown error'}`)
        setTimeout(() => router.push('/login'), 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Panel className="w-full max-w-md">
        <PanelBody className="space-y-4 p-8 text-center">
          <h1 className="type-h2 text-ink-hi">
            {error ? 'Verification failed' : 'Verifying your account'}
          </h1>

          {error ? (
            <InlineAlert tone="danger" className="text-left">
              {error}
            </InlineAlert>
          ) : (
            <>
              <InlineAlert tone="info" className="text-left">
                {message}
              </InlineAlert>
              <Spinner size={24} className="mx-auto text-arcane-300" />
            </>
          )}

          <p className="type-small text-ink-low">
            {error ? 'Taking you back to the sign-in page…' : 'Please wait…'}
          </p>
        </PanelBody>
      </Panel>
    </main>
  )
}
