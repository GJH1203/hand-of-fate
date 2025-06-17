import {Card} from "@/types/game";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/players`;

export interface PlayerDto {
    id: string;
    name: string;
    score: number;
    handSize: number;
    playerCardCounts: Record<string, number>;
    currentDeck?: {  // Make this optional since it's not in the DTO
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/game/players/${playerId}/hand`);

            if (!response.ok) {
                throw new Error('Failed to fetch player hand');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error fetching player hand: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getPlayerByUsername(username: string): Promise<PlayerDto> {
        try {
            const response = await fetch(`${API_BASE_URL}/by-name/${encodeURIComponent(username)}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Player '${username}' not found`);
                }
                throw new Error('Failed to fetch player by username');
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Error fetching player by username: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export const playerService = new PlayerService();
