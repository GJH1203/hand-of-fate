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
        pieces: Record<string, Card>;
    };
    currentPlayerId: string;
    currentPlayerHand: Card[];
}
