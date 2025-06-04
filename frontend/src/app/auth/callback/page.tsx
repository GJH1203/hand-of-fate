'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!isSupabaseConfigured || !supabase) {
        router.push('/auth?error=supabase_not_configured')
        return
      }
      
      try {
        // Handle the auth callback from Supabase
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth?error=callback_failed')
          return
        }

        if (data.session) {
          // Successfully authenticated, redirect to game
          router.push('/game')
        } else {
          // No session, redirect to auth
          router.push('/auth')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        router.push('/auth?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Verifying your account...</p>
      </div>
    </div>
  )
}