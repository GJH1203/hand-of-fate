import { SupabaseAuthService } from './supabaseAuthService'
import { User } from '@supabase/supabase-js'

export interface UnifiedAuthResponse {
  isSuccess: boolean
  message?: string
  token?: string
  userId?: string
  username?: string
  playerId?: string
}

interface BackendSyncRequest {
  supabaseUserId: string
  email: string
  username: string
}

/**
 * Unified Authentication Service
 * 
 * Workflow:
 * 1. Sign up through Supabase (with email verification)
 * 2. After email verification, sync user to backend and create Nakama account
 * 3. Login through Supabase, then get Nakama session from backend
 */
export class UnifiedAuthService {
  private supabaseAuth: SupabaseAuthService
  private backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth`

  constructor() {
    this.supabaseAuth = new SupabaseAuthService()
  }

  /**
   * Sign up new user
   * Step 1: Create Supabase account with email verification
   */
  async signUp(email: string, password: string, username: string) {
    try {
      // Create Supabase account
      const result = await this.supabaseAuth.signUp(email, password, username)
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Sign up failed',
          needsEmailVerification: false
        }
      }

      // Check if email verification is needed
      if (result.user && !result.user.email_confirmed_at) {
        return {
          success: true,
          needsEmailVerification: true,
          message: 'Please check your email and click the verification link'
        }
      }

      // If email is already verified (shouldn't happen in normal flow)
      if (result.user) {
        await this.syncUserToBackend(result.user)
      }

      return {
        success: true,
        needsEmailVerification: false
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Sign up failed',
        needsEmailVerification: false
      }
    }
  }

  /**
   * Sign in existing user
   * Step 1: Authenticate with Supabase
   * Step 2: Get player data and Nakama session from backend
   */
  async signIn(email: string, password: string): Promise<{
    success: boolean
    data?: UnifiedAuthResponse
    error?: string
  }> {
    try {
      // Step 1: Authenticate with Supabase
      const supabaseResult = await this.supabaseAuth.signIn(email, password)
      
      if (supabaseResult.error) {
        return {
          success: false,
          error: supabaseResult.error.message || 'Sign in failed'
        }
      }

      if (!supabaseResult.user || !supabaseResult.session) {
        return {
          success: false,
          error: 'Invalid credentials'
        }
      }

      // Check if email is verified
      if (!supabaseResult.user.email_confirmed_at) {
        return {
          success: false,
          error: 'Please verify your email before signing in'
        }
      }

      // Step 2: Sync with backend and get Nakama session
      const backendResult = await this.loginToBackend(supabaseResult.user)
      
      if (!backendResult.isSuccess) {
        // If player not found, try to sync first (for users who verified email but haven't synced yet)
        if (backendResult.message?.includes('not found')) {
          await this.syncUserToBackend(supabaseResult.user)
          // Retry login after sync
          const retryResult = await this.loginToBackend(supabaseResult.user)
          if (retryResult.isSuccess) {
            return {
              success: true,
              data: retryResult
            }
          }
        }
        
        return {
          success: false,
          error: backendResult.message || 'Failed to connect to game server'
        }
      }

      // Store auth data
      this.storeAuthData(backendResult)

      return {
        success: true,
        data: backendResult
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: error.message || 'Sign in failed'
      }
    }
  }

  /**
   * Sync verified Supabase user to backend
   * Creates Player model and Nakama account
   */
  async syncUserToBackend(supabaseUser: User): Promise<UnifiedAuthResponse> {
    try {
      const username = supabaseUser.user_metadata?.username || 
                      supabaseUser.email?.split('@')[0] || 
                      'User'
      
      const response = await fetch(`${this.backendUrl}/sync-verified-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUserId: supabaseUser.id,
          email: supabaseUser.email,
          username: username
        } as BackendSyncRequest)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to sync user')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Backend sync error:', error)
      return {
        isSuccess: false,
        message: error.message || 'Failed to sync with backend'
      }
    }
  }

  /**
   * Login to backend with Supabase user
   * Gets Player data and Nakama session
   */
  async loginToBackend(supabaseUser: User): Promise<UnifiedAuthResponse> {
    try {
      const username = supabaseUser.user_metadata?.username || 
                      supabaseUser.email?.split('@')[0] || 
                      'User'
      
      const response = await fetch(`${this.backendUrl}/login-with-supabase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUserId: supabaseUser.id,
          email: supabaseUser.email,
          username: username
        } as BackendSyncRequest)
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Backend login error:', error)
      return {
        isSuccess: false,
        message: error.message || 'Failed to connect to game server'
      }
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await this.supabaseAuth.signOut()
      this.clearAuthData()
    } catch (error) {
      console.error('Sign out error:', error)
      // Clear local data even if Supabase sign out fails
      this.clearAuthData()
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    return await this.supabaseAuth.getCurrentSession()
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string) {
    return await this.supabaseAuth.resendVerification(email)
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabaseAuth.onAuthStateChange((user, session) => {
      callback(user)
      // Don't auto-sync here to prevent multiple sync attempts
      // User should login manually after email verification
    })
  }

  /**
   * Store auth data in localStorage
   */
  storeAuthData(authData: UnifiedAuthResponse): void {
    if (typeof window !== 'undefined' && authData.isSuccess) {
      if (authData.token) localStorage.setItem('nakamaToken', authData.token)
      if (authData.playerId) localStorage.setItem('playerId', authData.playerId)
      if (authData.username) localStorage.setItem('username', authData.username)
      if (authData.userId) localStorage.setItem('nakamaUserId', authData.userId)
    }
  }

  /**
   * Get stored auth data
   */
  getStoredAuthData(): Partial<UnifiedAuthResponse> | null {
    if (typeof window === 'undefined') return null

    const token = localStorage.getItem('nakamaToken')
    const playerId = localStorage.getItem('playerId')
    const username = localStorage.getItem('username')
    const userId = localStorage.getItem('nakamaUserId')

    if (!playerId) return null

    return {
      token: token || undefined,
      playerId,
      username: username || undefined,
      userId: userId || undefined,
      isSuccess: true
    }
  }

  /**
   * Clear stored auth data
   */
  clearAuthData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nakamaToken')
      localStorage.removeItem('playerId')
      localStorage.removeItem('username')
      localStorage.removeItem('nakamaUserId')
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getStoredAuthData()
  }

  /**
   * Validate Nakama token
   */
  async validateNakamaToken(token: string): Promise<UnifiedAuthResponse> {
    try {
      const response = await fetch(`${this.backendUrl}/validate-nakama-token`, {
        method: 'GET',
        headers: {
          'Authorization': token,
        },
      })

      const data = await response.json()
      return data
    } catch (error) {
      return {
        isSuccess: false,
        message: 'Token validation failed'
      }
    }
  }
}

export const unifiedAuthService = new UnifiedAuthService()