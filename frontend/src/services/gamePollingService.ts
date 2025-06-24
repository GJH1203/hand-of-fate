import { GameState } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface PollingCallbacks {
  onGameStateUpdate?: (state: GameState) => void;
  onPlayerJoined?: (playerId: string) => void;
  onPlayerLeft?: (playerId: string) => void;
  onMatchCreated?: (matchId: string) => void;
  onError?: (error: any) => void;
}

class GamePollingService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private callbacks: PollingCallbacks = {};
  private currentMatchId: string | null = null;
  private currentPlayerId: string | null = null;

  async startPolling(matchId: string, playerId: string, callbacks: PollingCallbacks) {
    this.currentMatchId = matchId;
    this.currentPlayerId = playerId;
    this.callbacks = callbacks;

    // Poll immediately
    await this.pollGameState();

    // Then poll every 2 seconds
    this.pollingInterval = setInterval(() => {
      this.pollGameState();
    }, 2000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async pollGameState() {
    if (!this.currentMatchId || !this.currentPlayerId) return;

    try {
      const response = await fetch(`${API_URL}/online-game/${this.currentMatchId}/state`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch game state: ${response.status}`);
      }

      const gameState = await response.json();
      this.callbacks.onGameStateUpdate?.(gameState);
    } catch (error) {
      console.error('Polling error:', error);
      this.callbacks.onError?.(error);
    }
  }

  async createMatch(playerId: string): Promise<{ matchId: string }> {
    const response = await fetch(`${API_URL}/online-game/create-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create match');
    }

    const data = await response.json();
    this.callbacks.onMatchCreated?.(data.matchId);
    return data;
  }

  async joinMatch(matchId: string, playerId: string): Promise<any> {
    const response = await fetch(`${API_URL}/online-game/join-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ matchId, playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to join match');
    }

    return response.json();
  }

  async makeMove(gameId: string, playerId: string, move: any): Promise<any> {
    const response = await fetch(`${API_URL}/game/${gameId}/play`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        action: move.action,
        cardId: move.cardId,
        position: move.position,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to make move');
    }

    return response.json();
  }
}

export const gamePollingService = new GamePollingService();