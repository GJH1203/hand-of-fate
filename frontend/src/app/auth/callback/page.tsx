'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { unifiedAuthService } from '@/services/unifiedAuthService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {error ? '❌ Verification Error' : '✅ Email Verification'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {message && !error && (
            <Alert>
              <p>{message}</p>
            </Alert>
          )}
          
          {error && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <p>{error}</p>
            </Alert>
          )}

          {!error && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          )}
          
          <p className="text-sm text-muted-foreground">
            {error ? 'Redirecting to login page...' : 'Please wait...'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}