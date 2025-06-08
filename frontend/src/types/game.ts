export enum ActionType {
    PLACE_CARD = 'PLACE_CARD',
    PASS = 'PASS',
    REQUEST_WIN_CALCULATION = 'REQUEST_WIN_CALCULATION',
    RESPOND_TO_WIN_REQUEST = 'RESPOND_TO_WIN_REQUEST'
}

export interface Position {
    x: number;
    y: number;
}

export interface Card {
    id: string;
    power: number;
    name: string;
}

export interface GameState {
    id: string;
    state: 'INITIALIZED' | 'IN_PROGRESS' | 'COMPLETED';
    board: {
        width: number;
        height: number;
        pieces: Record<string, string>; // Backend sends {"x,y": "cardId"}
    };
    currentPlayerId: string;
    currentPlayerHand: Card[];
    placedCards: Record<string, Card>; // Map of cardId to Card for all placed cards
    scores?: Record<string, number>; // Player ID to score mapping
    winnerId?: string | null;
    isTie?: boolean;
    hasPendingWinRequest?: boolean;
    pendingWinRequestPlayerId?: string | null;
    cardOwnership?: Record<string, string>; // Map of position to player ID
    playerIds?: string[]; // List of player IDs in the game
}

export interface InitializePayload {
    playerIds: string[];
    deckIds: string[];
}

export interface MovePayload {
    type: 'PLACE_CARD';
    playerId: string;
    card: Card;
    targetPosition: Position;
    timestamp: number;
}

export interface WinRequestPayload {
    playerId: string;
}

export interface WinResponsePayload {
    playerId: string;
    accepted: boolean;  // Changed to match backend's expected field name
}
