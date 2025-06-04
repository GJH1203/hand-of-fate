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
      // First, check if player already exists in backend
      const existingPlayer = await this.findPlayerBySupabaseId(supabaseUser.id)
      if (existingPlayer) {
        return existingPlayer
      }

      // If not exists, create new player in backend
      return await this.createPlayerInBackend(supabaseUser)
    } catch (error) {
      console.error('Failed to sync user with backend:', error)
      return null
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
      
      const response = await fetch(`${this.backendUrl}/auth/create-from-supabase`, {
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
        return await response.json()
      } else {
        const errorText = await response.text()
        console.error('Failed to create player in backend:', errorText)
        return null
      }
    } catch (error) {
      console.error('Failed to create player in backend:', error)
      return null
    }
  }

  /**
   * Get player data for authenticated user
   */
  async getPlayerData(supabaseUserId: string): Promise<BackendPlayer | null> {
    return await this.findPlayerBySupabaseId(supabaseUserId)
  }
}