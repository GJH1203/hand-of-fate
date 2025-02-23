import {Card} from "@/types/game";

const API_BASE_URL = 'http://localhost:8080/players';

export interface PlayerDto {
    id: string;
    name: string;
    currentDeck: {
        id: string;
        cards: Array<{
            id: string;
            power: number;
            name: string;
        }>;
    };
}

class PlayerService {
    async createPlayer(name: string): Promise<PlayerDto> {
        try {
            const response = await fetch(`${API_BASE_URL}?name=${encodeURIComponent(name)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to create player');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error creating player: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getPlayer(playerId: string): Promise<PlayerDto> {
        try {
            const response = await fetch(`${API_BASE_URL}/${playerId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch player');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error fetching player: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getPlayerHand(playerId: string): Promise<Array<Card>> {
        try {
            const response = await fetch(`${API_BASE_URL}/game/players/${playerId}/hand`);

            if (!response.ok) {
                throw new Error('Failed to fetch player hand');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error fetching player hand: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export const playerService = new PlayerService();
