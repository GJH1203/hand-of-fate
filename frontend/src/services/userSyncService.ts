import { User } from '@supabase/supabase-js'

interface BackendPlayer {
  id: string
  name: string
  email: string
  supabaseUserId: string
}

export class UserSyncService {
  private backendUrl = 'http://localhost:8080'

  /**
   * Create or get player in backend database from Supabase user
   */
  async syncUserWithBackend(supabaseUser: User): Promise<BackendPlayer | null> {
    try {
      console.log('Starting sync for Supabase user:', supabaseUser.id)
      
      // First, check if player already exists in backend
      const existingPlayer = await this.findPlayerBySupabaseId(supabaseUser.id)
      if (existingPlayer) {
        console.log('Found existing player:', existingPlayer.id)
        return existingPlayer
      }

      console.log('No existing player found, creating new one')
      // If not exists, create new player in backend
      return await this.createPlayerInBackend(supabaseUser)
    } catch (error) {
      console.error('Failed to sync user with backend:', error)
      throw error // Re-throw to let caller handle it
    }
  }

  /**
   * Check if player exists in backend by Supabase user ID
   */
  private async findPlayerBySupabaseId(supabaseUserId: string): Promise<BackendPlayer | null> {
    try {
      const response = await fetch(`${this.backendUrl}/players/by-supabase-id/${supabaseUserId}`)
      
      if (response.ok) {
        return await response.json()
      }
      
      return null
    } catch (error) {
      console.error('Failed to find player by Supabase ID:', error)
      return null
    }
  }

  /**
   * Create new player in backend database
   */
  private async createPlayerInBackend(supabaseUser: User): Promise<BackendPlayer | null> {
    try {
      const username = supabaseUser.user_metadata?.username || 
                      supabaseUser.email?.split('@')[0] || 
                      'User'
      
      console.log('Creating player in backend with:', {
        supabaseUserId: supabaseUser.id,
        email: supabaseUser.email,
        username: username
      })
      
      const response = await fetch(`${this.backendUrl}/api/auth/sync-verified-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUserId: supabaseUser.id,
          email: supabaseUser.email,
          username: username
        })
      })

      if (response.ok) {
        const player = await response.json()
        console.log('Successfully created player in backend:', player)
        return player
      } else {
        const errorText = await response.text()
        console.error('Backend responded with error:', response.status, errorText)
        
        // If it's a duplicate error, try to find the existing player
        if (response.status === 400 && errorText.includes('already exists')) {
          console.log('Player already exists, attempting to find existing player')
          return await this.findPlayerBySupabaseId(supabaseUser.id)
        }
        
        throw new Error(`Backend error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to create player in backend:', error)
      throw error // Re-throw to let caller handle it
    }
  }

  /**
   * Get player data for authenticated user
   */
  async getPlayerData(supabaseUserId: string): Promise<BackendPlayer | null> {
    return await this.findPlayerBySupabaseId(supabaseUserId)
  }

  /**
   * Integrate existing Supabase user with Nakama
   */
  async integrateWithNakama(supabaseUser: User): Promise<any> {
    try {
      const username = supabaseUser.user_metadata?.username || 
                      supabaseUser.email?.split('@')[0] || 
                      'User'
      
      console.log('Integrating Supabase user with Nakama:', {
        supabaseUserId: supabaseUser.id,
        email: supabaseUser.email,
        username: username
      })
      
      // Integration is now handled automatically by the unified auth controller
      // Just return success since the sync endpoint handles both player and Nakama creation
      return { 
        isSuccess: true, 
        message: 'Nakama integration handled by sync endpoint' 
      }
    } catch (error) {
      console.error('Failed to integrate with Nakama:', error)
      throw error
    }
  }
}