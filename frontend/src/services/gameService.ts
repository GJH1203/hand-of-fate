import type { GameState, MovePayload, InitializePayload } from '@/types/game';

const API_BASE_URL = 'http://localhost:8080/game';

class GameService {
    async initializeGame(
        player1Id: string,
        player2Id: string,
        deck1Id: string,
        deck2Id: string
    ): Promise<GameState> {
        try {
            const payload: InitializePayload = {
                playerIds: [player1Id, player2Id],
                deckIds: [deck1Id, deck2Id]
            };

            const response = await fetch(`${API_BASE_URL}/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to initialize game');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async makeMove(gameId: string, move: MovePayload): Promise<GameState> {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}/moves`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(move),
            });

            if (!response.ok) {
                throw new Error('Failed to make move');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error making move: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getGame(gameId: string): Promise<GameState> {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch game state');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error fetching game state: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export const gameService = new GameService();
