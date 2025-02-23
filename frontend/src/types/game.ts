export interface Position {
    x: number;
    y: number;
}

export interface Card {
    id: string;
    power: number;
    name: string;
    player?: 1 | 2;
}

export interface Board {
    width: number;
    height: number;
    pieces: Record<string, Card | null>;
}

export interface GameState {
    id: string;
    currentPlayerId: string;
    board: Board;  // Changed from (Card | null)[] to Board
    currentPlayerHand: Card[];
    validMoves: number[];
    scores?: {
        player1: number;
        player2: number;
    };
    players: string[];
    status?: 'ACTIVE' | 'FINISHED';
}

export interface MovePayload {
    playerId: string;
    card: Card;
    position: number;
}

export interface InitializePayload {
    playerIds: [string, string];
    deckIds: [string, string];
}
