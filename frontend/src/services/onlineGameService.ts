import { OnlineMatchInfo } from '@/types/gameMode';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

class OnlineGameService {
  /**
   * Create a new online match
   */
  async createMatch(playerId: string): Promise<CreateMatchResponse> {
    const response = await fetch(`${API_URL}/api/online-game/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create match');
    }

    return response.json();
  }

  /**
   * Join an existing match
   */
  async joinMatch(matchId: string, playerId: string): Promise<JoinMatchResponse> {
    const response = await fetch(`${API_URL}/api/online-game/join/${matchId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${API_URL}/api/online-game/match/${matchId}/state`);

    if (!response.ok) {
      throw new Error('Failed to get match state');
    }

    return response.json();
  }

  /**
   * Send a game action
   */
  async sendAction(matchId: string, action: any): Promise<void> {
    const response = await fetch(`${API_URL}/api/online-game/match/${matchId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    await fetch(`${API_URL}/api/online-game/match/${matchId}/disconnect/${playerId}`, {
      method: 'POST',
    });
  }
}

export const onlineGameService = new OnlineGameService();