export interface Card {
    id: string;
    power: number;
    name: string;
    player?: 1 | 2;
}

export interface GameState {
    id: string;
    currentPlayerId: string;
    board: (Card | null)[];
    currentPlayerHand: Card[];
    validMoves: number[];
    scores?: {
        player1: number;
        player2: number;
    };
    players: string[]; // Added to match backend
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
