import { apiFetch } from '@/lib/apiClient';
import { OnlineMatchInfo } from '@/types/gameMode';

export interface CreateMatchResponse {
  matchId: string;
  status: string;
  message: string;
}

export interface JoinMatchResponse {
  matchId: string;
  gameId: string;
  status: string;
  message: string;
  gameState?: string;
}

export interface ActiveGame {
  hasActiveGame: boolean;
  gameId?: string;
  matchId?: string;
  gameState?: string;
  isCurrentTurn?: boolean;
  opponentId?: string;
}

class OnlineGameService {
  /**
   * Create a new online match
   */
  async createMatch(playerId: string): Promise<CreateMatchResponse> {
    const response = await apiFetch(`/api/online-game/create`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create match with status ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Join an existing match
   */
  async joinMatch(matchId: string, playerId: string): Promise<JoinMatchResponse> {
    const response = await apiFetch(`/api/online-game/join/${matchId}`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to join match');
    }

    return response.json();
  }

  /**
   * Get current match state
   */
  async getMatchState(matchId: string): Promise<any> {
    const response = await apiFetch(`/api/online-game/match/${matchId}/state`);

    if (!response.ok) {
      throw new Error('Failed to get match state');
    }

    return response.json();
  }

  /**
   * Send a game action
   */
  async sendAction(matchId: string, action: any): Promise<void> {
    const response = await apiFetch(`/api/online-game/match/${matchId}/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    });

    if (!response.ok) {
      throw new Error('Failed to send action');
    }
  }

  /**
   * Disconnect from match
   */
  async disconnect(matchId: string, playerId: string): Promise<void> {
    await apiFetch(`/api/online-game/match/${matchId}/disconnect/${playerId}`, {
      method: 'POST',
    });
  }

  /**
   * Leave all matches for a player (useful before creating/joining new matches)
   */
  async leaveAllMatches(playerId: string): Promise<void> {
    try {
      const response = await apiFetch(`/api/online-game/leave-all/${playerId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        console.warn('Failed to leave all matches, but continuing anyway');
      }
    } catch (error) {
      console.warn('Error leaving matches:', error);
      // Don't throw - allow the user to continue
    }
  }

  /**
   * Check if player has any active games
   */
  async checkActiveGame(playerId: string): Promise<ActiveGame> {
    try {
      const response = await apiFetch(`/api/online-game/active-game/${playerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to check active games');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error checking active games:', error);
      return { hasActiveGame: false };
    }
  }
}

export const onlineGameService = new OnlineGameService();