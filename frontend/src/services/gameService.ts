import { Card, GameState, InitializePayload, MovePayload, Position, WinRequestPayload, WinResponsePayload } from '@/types/game';
import { playerService } from './playerService';

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
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to initialize game');
            }

            const gameData = await response.json();
            
            // Transform the backend response to match our frontend structure
            return await this.transformGameResponse(gameData, player1Id);
        } catch (error) {
            throw new Error(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async makeMove(gameId: string, moveData: MovePayload): Promise<GameState> {
        try {
            console.log('Making move API call:', {
                url: `${API_BASE_URL}/${gameId}/moves`,
                moveData
            });

            const response = await fetch(`${API_BASE_URL}/${gameId}/moves`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: moveData.playerId,
                    card: moveData.card,
                    position: moveData.targetPosition
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to make move');
            }

            const gameData = await response.json();
            return await this.transformGameResponse(gameData, moveData.playerId);
        } catch (error) {
            console.error('Move API error:', error);
            throw error;
        }
    }

    async getGame(gameId: string): Promise<GameState> {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to fetch game state');
            }

            const gameData = await response.json();
            // We need to know the current player ID to fetch their hand
            // For now, use the currentPlayerId from the response
            return await this.transformGameResponse(gameData, gameData.currentPlayerId);
        } catch (error) {
            throw new Error(`Error fetching game state: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async requestWin(gameId: string, playerId: string): Promise<GameState> {
        try {
            const payload: WinRequestPayload = { playerId };
            
            const response = await fetch(`${API_BASE_URL}/${gameId}/request-win`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to request win');
            }

            const gameData = await response.json();
            return await this.transformGameResponse(gameData, playerId);
        } catch (error) {
            throw new Error(`Error requesting win: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async respondToWinRequest(gameId: string, playerId: string, acceptRequest: boolean): Promise<GameState> {
        try {
            const payload: WinResponsePayload = { playerId, accepted: acceptRequest };
            
            const response = await fetch(`${API_BASE_URL}/${gameId}/respond-win-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to respond to win request');
            }

            const gameData = await response.json();
            return await this.transformGameResponse(gameData, playerId);
        } catch (error) {
            throw new Error(`Error responding to win request: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async processMove(action: any, gameId: string): Promise<GameState> {
        try {
            const response = await fetch(`${API_BASE_URL}/${gameId}/actions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(action),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to process action');
            }

            const gameData = await response.json();
            return await this.transformGameResponse(gameData, action.playerId);
        } catch (error) {
            throw new Error(`Error processing action: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async transformGameResponse(backendData: any, currentPlayerId: string): Promise<GameState> {
        console.log('Backend response:', backendData);
        
        // Transform the backend pieces format to our frontend format
        const pieces: Record<string, string> = {};
        const placedCards: Record<string, Card> = {};
        
        if (backendData.board && backendData.board.pieces) {
            // Backend sends pieces as a Map<PositionDto, String>
            // In JSON, complex keys are serialized as strings like "{\"x\":0,\"y\":0}"
            const piecesData = backendData.board.pieces;
            console.log('Pieces data type:', typeof piecesData, 'Is array:', Array.isArray(piecesData));
            console.log('Pieces data:', piecesData);
            
            if (Array.isArray(piecesData)) {
                // If it's an array of entries
                piecesData.forEach(([pos, cardId]: [any, string]) => {
                    const positionKey = `${pos.x},${pos.y}`;
                    pieces[positionKey] = String(cardId);
                    
                    // For now, create mock card data - ideally we'd fetch this from backend
                    const cardIdParts = String(cardId).split('_');
                    const cardNumber = cardIdParts.length > 2 ? parseInt(cardIdParts[2]) || 1 : 1;
                    placedCards[String(cardId)] = {
                        id: String(cardId),
                        name: `Card #${cardNumber}`,
                        power: 1  // Default cards have power 1
                    };
                });
            } else {
                // If it's an object with string keys
                Object.entries(piecesData).forEach(([key, value]: [string, any]) => {
                    // Keys should now be in "x,y" format
                    const positionKey = key;
                    console.log('Processing piece key:', key, 'value:', value);
                    
                    pieces[positionKey] = String(value);
                    
                    // For now, create mock card data - ideally we'd fetch this from backend
                    const valueIdParts = String(value).split('_');
                    const cardNumber = valueIdParts.length > 2 ? parseInt(valueIdParts[2]) || 1 : 1;
                    placedCards[String(value)] = {
                        id: String(value),
                        name: `Card #${cardNumber}`,
                        power: 1  // Default cards have power 1
                    };
                });
            }
        }
        
        // Fetch the current player's hand if not included in the response
        let currentPlayerHand = backendData.currentPlayerHand || [];
        
        if (currentPlayerHand.length === 0 && currentPlayerId) {
            try {
                currentPlayerHand = await playerService.getPlayerHand(currentPlayerId);
            } catch (error) {
                console.error('Failed to fetch player hand:', error);
            }
        }
        
        return {
            id: backendData.id,
            state: backendData.state,
            board: {
                width: backendData.board?.width || 3,
                height: backendData.board?.height || 5,
                pieces
            },
            currentPlayerId: backendData.currentPlayerId,
            currentPlayerHand,
            placedCards,
            scores: backendData.scores,
            winnerId: backendData.winnerId,
            isTie: backendData.isTie,
            hasPendingWinRequest: backendData.hasPendingWinRequest,
            pendingWinRequestPlayerId: backendData.pendingWinRequestPlayerId
        };
    }
}

export const gameService = new GameService();
