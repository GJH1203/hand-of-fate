import { supabase, AuthResponse, AuthUser, isSupabaseConfigured } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

// Helper function to get redirect URL
function getRedirectUrl(): string {
  return `${window.location.protocol}//${window.location.host}/auth/callback`
}

export class SupabaseAuthService {
  private checkConfiguration() {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please add your credentials to .env.local')
    }
  }
  /**
   * Sign up with email and password - requires email verification
   */
  async signUp(email: string, password: string, username: string): Promise<AuthResponse> {
    this.checkConfiguration()
    try {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          },
          // Email verification is required
          emailRedirectTo: getRedirectUrl()
        }
      })

      if (error) {
        return { user: null, session: null, error }
      }

      // If user needs to verify email
      if (data.user && !data.user.email_confirmed_at) {
        return {
          user: data.user,
          session: data.session,
          error: null
        }
      }

      return {
        user: data.user,
        session: data.session,
        error: null
      }
    } catch (error) {
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    this.checkConfiguration()
    try {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { user: null, session: null, error }
      }

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        return {
          user: null,
          session: null,
          error: { message: 'Please verify your email before signing in' }
        }
      }

      return {
        user: data.user,
        session: data.session,
        error: null
      }
    } catch (error) {
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: any }> {
    this.checkConfiguration()
    const { error } = await supabase!.auth.signOut()
    return { error }
  }

  /**
   * Get current user session
   */
  async getCurrentSession(): Promise<{ user: User | null, session: Session | null }> {
    this.checkConfiguration()
    const { data: { session } } = await supabase!.auth.getSession()
    return {
      user: session?.user || null,
      session: session
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    this.checkConfiguration()
    const { data: { user } } = await supabase!.auth.getUser()
    return user
  }

  /**
   * Resend email verification
   */
  async resendVerification(email: string): Promise<{ error: any }> {
    this.checkConfiguration()
    const { error } = await supabase!.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: getRedirectUrl()
      }
    })
    return { error }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    this.checkConfiguration()
    return supabase!.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null, session)
    })
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: any }> {
    this.checkConfiguration()
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error }
  }
}