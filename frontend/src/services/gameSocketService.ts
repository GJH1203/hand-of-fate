import { Client, Session, Socket, Match, MatchData } from '@heroiclabs/nakama-js';
import { Card, Position, GameState, ActionType } from '@/types/game';

// Message opcodes matching the Lua match handler
export enum OpCode {
  JOIN_SUCCESS = 1,
  GAME_STATE_UPDATE = 2,
  PLAYER_ACTION = 3,
  PLAYER_DISCONNECTED = 4,
  PLAYER_RECONNECTED = 5,
  GAME_ERROR = 6,
  MATCH_START = 7,
  TURN_UPDATE = 8,
  GAME_END = 9
}

export interface GameSocketCallbacks {
  onMatchStart?: (data: any) => void;
  onGameStateUpdate?: (gameState: GameState) => void;
  onPlayerAction?: (action: any) => void;
  onPlayerDisconnected?: (playerId: string) => void;
  onPlayerReconnected?: (playerId: string) => void;
  onGameError?: (error: string) => void;
  onTurnUpdate?: (currentPlayerId: string) => void;
  onGameEnd?: (data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}

class GameSocketService {
  private client: Client | null = null;
  private socket: Socket | null = null;
  private session: Session | null = null;
  private currentMatch: Match | null = null;
  private callbacks: GameSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isReconnecting = false;

  constructor() {
    // Initialize Nakama client
    const useSSL = false;
    const host = process.env.NEXT_PUBLIC_NAKAMA_HOST || 'localhost';
    const port = process.env.NEXT_PUBLIC_NAKAMA_PORT || '7350';
    const serverkey = process.env.NEXT_PUBLIC_NAKAMA_SERVER_KEY || 'defaultkey';
    
    this.client = new Client(serverkey, host, port, useSSL);
  }

  /**
   * Initialize connection with existing session
   */
  async initialize(nakamaToken: string, callbacks: GameSocketCallbacks) {
    try {
      this.callbacks = callbacks;
      
      // Create session from token
      this.session = Session.restore(nakamaToken);
      
      // Create socket
      this.socket = this.client!.createSocket();
      
      // Set up socket event handlers
      this.setupSocketHandlers();
      
      // Connect socket
      await this.socket.connect(this.session, true);
      
      console.log('GameSocket connected successfully');
      this.callbacks.onConnectionChange?.(true);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize game socket:', error);
      this.callbacks.onConnectionChange?.(false);
      return false;
    }
  }

  /**
   * Create a new match
   */
  async createMatch(): Promise<string | null> {
    if (!this.socket) {
      console.error('Socket not initialized');
      return null;
    }

    try {
      // Create match with custom match handler
      const match = await this.socket.createMatch('game_match');
      this.currentMatch = match;
      
      console.log('Match created:', match.match_id);
      return match.match_id;
    } catch (error) {
      console.error('Failed to create match:', error);
      return null;
    }
  }

  /**
   * Join an existing match
   */
  async joinMatch(matchId: string): Promise<boolean> {
    if (!this.socket) {
      console.error('Socket not initialized');
      return false;
    }

    try {
      const match = await this.socket.joinMatch(matchId);
      this.currentMatch = match;
      
      console.log('Joined match:', match.match_id);
      return true;
    } catch (error) {
      console.error('Failed to join match:', error);
      return false;
    }
  }

  /**
   * Send a player action
   */
  async sendAction(action: any) {
    if (!this.socket || !this.currentMatch) {
      console.error('Not connected to a match');
      return;
    }

    const message = {
      opcode: OpCode.PLAYER_ACTION,
      ...action
    };

    await this.socket.sendMatchState(
      this.currentMatch.match_id,
      OpCode.PLAYER_ACTION,
      JSON.stringify(message)
    );
  }

  /**
   * Send a game state update (for host/server sync)
   */
  async sendGameStateUpdate(gameState: GameState) {
    if (!this.socket || !this.currentMatch) {
      console.error('Not connected to a match');
      return;
    }

    const message = {
      opcode: OpCode.GAME_STATE_UPDATE,
      game_state: gameState
    };

    await this.socket.sendMatchState(
      this.currentMatch.match_id,
      OpCode.GAME_STATE_UPDATE,
      JSON.stringify(message)
    );
  }

  /**
   * Leave the current match
   */
  async leaveMatch() {
    if (!this.socket || !this.currentMatch) {
      return;
    }

    try {
      await this.socket.leaveMatch(this.currentMatch.match_id);
      this.currentMatch = null;
      console.log('Left match');
    } catch (error) {
      console.error('Error leaving match:', error);
    }
  }

  /**
   * Disconnect from socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.session = null;
      this.currentMatch = null;
    }
  }

  /**
   * Set up socket event handlers
   */
  private setupSocketHandlers() {
    if (!this.socket) return;

    // Handle connection events
    this.socket.ondisconnect = (evt) => {
      console.log('Socket disconnected:', evt);
      this.callbacks.onConnectionChange?.(false);
      this.handleDisconnect();
    };

    this.socket.onerror = (evt) => {
      console.error('Socket error:', evt);
      this.callbacks.onGameError?.('Connection error');
    };

    // Handle match data
    this.socket.onmatchdata = (matchData: MatchData) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(matchData.data));
        
        switch (matchData.op_code) {
          case OpCode.JOIN_SUCCESS:
            console.log('Join success:', data);
            break;
            
          case OpCode.MATCH_START:
            this.callbacks.onMatchStart?.(data);
            break;
            
          case OpCode.GAME_STATE_UPDATE:
            this.callbacks.onGameStateUpdate?.(data.game_state);
            break;
            
          case OpCode.PLAYER_ACTION:
            this.callbacks.onPlayerAction?.(data);
            break;
            
          case OpCode.PLAYER_DISCONNECTED:
            this.callbacks.onPlayerDisconnected?.(data.player_id);
            break;
            
          case OpCode.PLAYER_RECONNECTED:
            this.callbacks.onPlayerReconnected?.(data.player_id);
            break;
            
          case OpCode.GAME_ERROR:
            this.callbacks.onGameError?.(data.error);
            break;
            
          case OpCode.TURN_UPDATE:
            this.callbacks.onTurnUpdate?.(data.current_player_id);
            break;
            
          case OpCode.GAME_END:
            this.callbacks.onGameEnd?.(data);
            break;
        }
      } catch (error) {
        console.error('Error parsing match data:', error);
      }
    };

    // Handle match presence events
    this.socket.onmatchpresence = (matchPresence) => {
      // Handle players joining/leaving
      if (matchPresence.leaves && matchPresence.leaves.length > 0) {
        matchPresence.leaves.forEach(presence => {
          this.callbacks.onPlayerDisconnected?.(presence.user_id);
        });
      }
      
      if (matchPresence.joins && matchPresence.joins.length > 0) {
        matchPresence.joins.forEach(presence => {
          this.callbacks.onPlayerReconnected?.(presence.user_id);
        });
      }
    };
  }

  /**
   * Handle disconnection with reconnection logic
   */
  private async handleDisconnect() {
    if (this.isReconnecting || !this.currentMatch) {
      return;
    }

    this.isReconnecting = true;

    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      try {
        // Wait before reconnecting
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        
        // Try to reconnect
        if (this.session && this.socket) {
          await this.socket.connect(this.session, true);
          
          // Rejoin match
          if (this.currentMatch) {
            await this.socket.joinMatch(this.currentMatch.match_id);
          }
          
          console.log('Reconnected successfully');
          this.callbacks.onConnectionChange?.(true);
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          return;
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
      }
    }

    // Max attempts reached
    console.error('Failed to reconnect after maximum attempts');
    this.callbacks.onGameError?.('Failed to reconnect to game');
    this.isReconnecting = false;
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.socket?.isConnected() || false;
  }

  /**
   * Get current match ID
   */
  getCurrentMatchId(): string | null {
    return this.currentMatch?.match_id || null;
  }
}

// Export singleton instance
export const gameSocketService = new GameSocketService();