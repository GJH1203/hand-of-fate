import { GameState } from '@/types/game';

export enum MessageType {
  // Connection
  CONNECTION_SUCCESS = 'CONNECTION_SUCCESS',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // Match management
  JOIN_MATCH = 'JOIN_MATCH',
  JOIN_SUCCESS = 'JOIN_SUCCESS',
  LEAVE_MATCH = 'LEAVE_MATCH',
  LEAVE_SUCCESS = 'LEAVE_SUCCESS',
  
  // Game events
  GAME_ACTION = 'GAME_ACTION',
  GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
  GAME_STATE_REQUEST = 'GAME_STATE_REQUEST',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_DISCONNECTED = 'PLAYER_DISCONNECTED',
  PLAYER_RECONNECTED = 'PLAYER_RECONNECTED',
  TURN_UPDATE = 'TURN_UPDATE',
  GAME_END = 'GAME_END',
  
  // Error
  ERROR = 'ERROR'
}

export interface WebSocketMessage {
  type: MessageType;
  data: any;
  timestamp?: number;
}

export interface GameWebSocketCallbacks {
  onConnectionSuccess?: () => void;
  onJoinSuccess?: (data: any) => void;
  onGameStateUpdate?: (gameState: GameState) => void;
  onPlayerJoined?: (playerId: string) => void;
  onPlayerDisconnected?: (playerId: string) => void;
  onPlayerReconnected?: (playerId: string) => void;
  onGameAction?: (action: any) => void;
  onError?: (error: string) => void;
  onConnectionClosed?: () => void;
}

class GameWebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: GameWebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isReconnecting = false;
  private currentMatchId: string | null = null;
  private currentPlayerId: string | null = null;

  connect(callbacks: GameWebSocketCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Reset connection state for fresh start
        this.reconnectAttempts = 0;
        this.isReconnecting = true; // Allow reconnection for this session
        
        // Check if already connected or connecting
        if (this.ws) {
          if (this.ws.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket is already connecting, waiting...');
            // Wait for connection to complete
            const checkConnection = setInterval(() => {
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                clearInterval(checkConnection);
                resolve();
              } else if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                clearInterval(checkConnection);
                // Try to connect again
                this.ws = null;
                this.connect(callbacks).then(resolve).catch(reject);
              }
            }, 100);
            return;
          }
          
          if (this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket is already connected');
            resolve();
            return;
          }
        }
        
        this.callbacks = callbacks;
        
        // Determine WebSocket URL
        let wsUrl: string;
        
        // Check if we're in production with HTTPS
        const isProduction = window.location.protocol === 'https:';
        const isUsingProxy = process.env.NEXT_PUBLIC_API_URL?.startsWith('/api/');
        
        if (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')) {
          // Direct HTTPS connection - use WSS
          const host = process.env.NEXT_PUBLIC_API_URL.replace(/^https:\/\//, '');
          wsUrl = `wss://${host}/ws/game`;
        } else if (process.env.NEXT_PUBLIC_API_URL?.startsWith('http://')) {
          // Direct HTTP connection - use WS
          const host = process.env.NEXT_PUBLIC_API_URL.replace(/^http:\/\//, '');
          wsUrl = `ws://${host}/ws/game`;
        } else {
          // Local development or fallback
          wsUrl = 'ws://localhost:8080/ws/game';
        }
        
        console.log('Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket closed, isReconnecting:', this.isReconnecting);
          this.callbacks.onConnectionClosed?.();
          
          // Only attempt to reconnect if we're supposed to
          if (this.isReconnecting === true) {
            this.handleReconnect();
          }
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  joinMatch(matchId: string, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected, cannot join match');
        reject(new Error('WebSocket not connected'));
        return;
      }

      console.log('Joining match via WebSocket:', { matchId, playerId });
      this.currentMatchId = matchId;
      this.currentPlayerId = playerId;

      // Store the resolve callback to call when we get JOIN_SUCCESS
      const originalOnJoinSuccess = this.callbacks.onJoinSuccess;
      this.callbacks.onJoinSuccess = (data) => {
        console.log('JOIN_SUCCESS received:', data);
        // Restore original callback
        this.callbacks.onJoinSuccess = originalOnJoinSuccess;
        // Call original callback if exists
        originalOnJoinSuccess?.(data);
        // Resolve the promise
        resolve();
      };

      const message: WebSocketMessage = {
        type: MessageType.JOIN_MATCH,
        data: { matchId, playerId }
      };

      console.log('Sending JOIN_MATCH message:', message);
      this.ws.send(JSON.stringify(message));
      
      // Add timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Join match timeout'));
      }, 5000);
      
      // Clear timeout in success handler
      this.callbacks.onJoinSuccess = (data) => {
        console.log('JOIN_SUCCESS received:', data);
        clearTimeout(timeoutId); // Clear the timeout
        // Restore original callback
        this.callbacks.onJoinSuccess = originalOnJoinSuccess;
        // Call original callback if exists
        originalOnJoinSuccess?.(data);
        // Resolve the promise
        resolve();
      };
    });
  }

  leaveMatch(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WebSocketMessage = {
      type: MessageType.LEAVE_MATCH,
      data: {}
    };

    this.ws.send(JSON.stringify(message));
    this.currentMatchId = null;
    this.currentPlayerId = null;
  }

  sendGameAction(action: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    if (!this.currentMatchId) {
      console.error('Cannot send game action without match ID');
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.GAME_ACTION,
      data: {
        matchId: this.currentMatchId,
        action: action
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  requestGameState(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.currentMatchId || !this.currentPlayerId) {
      console.error('Cannot request game state without match/player ID');
      return;
    }

    const message: WebSocketMessage = {
      type: MessageType.GAME_STATE_REQUEST,
      data: {
        matchId: this.currentMatchId,
        playerId: this.currentPlayerId
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    console.log('Disconnecting WebSocket...');
    this.isReconnecting = false; // Prevent auto-reconnection
    
    if (this.ws) {
      // Remove event handlers to prevent any callbacks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
    
    // Clear state
    this.currentMatchId = null;
    this.currentPlayerId = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async ensureConnected(callbacks: GameWebSocketCallbacks): Promise<void> {
    if (this.isConnected()) {
      console.log('WebSocket already connected');
      return;
    }
    
    console.log('WebSocket not connected, establishing connection...');
    // Reset state for new connection
    this.isReconnecting = true;
    this.reconnectAttempts = 0;
    
    return this.connect(callbacks);
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('Received message:', message.type, message.data);

    switch (message.type) {
      case MessageType.CONNECTION_SUCCESS:
        this.callbacks.onConnectionSuccess?.();
        break;

      case MessageType.JOIN_SUCCESS:
        this.callbacks.onJoinSuccess?.(message.data);
        break;

      case MessageType.GAME_STATE_UPDATE:
        this.callbacks.onGameStateUpdate?.(message.data);
        break;

      case MessageType.PLAYER_JOINED:
        this.callbacks.onPlayerJoined?.(message.data.playerId);
        break;

      case MessageType.PLAYER_DISCONNECTED:
        this.callbacks.onPlayerDisconnected?.(message.data.playerId);
        break;

      case MessageType.PLAYER_RECONNECTED:
        this.callbacks.onPlayerReconnected?.(message.data.playerId);
        break;

      case MessageType.GAME_ACTION:
        this.callbacks.onGameAction?.(message.data);
        break;

      case MessageType.ERROR:
        this.callbacks.onError?.(message.data.error);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;

    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      try {
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        await this.connect(this.callbacks);

        // Rejoin match if we were in one
        if (this.currentMatchId && this.currentPlayerId) {
          this.joinMatch(this.currentMatchId, this.currentPlayerId);
        }

        console.log('Reconnected successfully');
        this.isReconnecting = false;
        return;
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
      }
    }

    console.error('Failed to reconnect after maximum attempts');
    this.callbacks.onError?.('Failed to reconnect to game server');
    this.isReconnecting = false;
  }
}

// Export singleton instance
export const gameWebSocketService = new GameWebSocketService();