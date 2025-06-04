'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!isSupabaseConfigured || !supabase) {
        console.error('Supabase not configured')
        router.push('/auth?error=supabase_not_configured')
        return
      }
      
      try {
        console.log('Handling auth callback...')
        
        // Handle the auth callback from Supabase
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Auth callback error:', sessionError)
          setError(`Session error: ${sessionError.message}`)
          setTimeout(() => router.push('/auth?error=callback_failed'), 3000)
          return
        }

        if (data.session && data.session.user) {
          console.log('Session found, user:', data.session.user.id, 'email confirmed:', data.session.user.email_confirmed_at)
          
          if (data.session.user.email_confirmed_at) {
            console.log('Email is confirmed, will redirect to sign-in page for backend sync')
            // Redirect to sign-in page instead of game to trigger proper sync
            setTimeout(() => router.push('/auth/supabase?verified=true'), 1000)
          } else {
            console.log('Email not confirmed yet')
            router.push('/auth/supabase?message=email_verification_pending')
          }
        } else {
          console.log('No session found, redirecting to auth')
          router.push('/auth')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        setError(`Callback error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setTimeout(() => router.push('/auth?error=callback_failed'), 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">❌</div>
          <h2 className="text-lg font-semibold mb-2">Verification Failed</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to sign in page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Verifying your account...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
      </div>
    </div>
  )
}