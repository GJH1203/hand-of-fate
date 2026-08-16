# Hand of Fate - Backend API Workflow Documentation

## Overview
This document outlines the complete backend API workflow for the Hand of Fate card game, including authentication, game management, and online multiplayer functionality.

## Base URL
```
http://localhost:8080
```

## API Endpoints by Category

### 1. Authentication & User Management

#### Unified Authentication
```http
POST /api/unified-auth/authenticate
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com"
}

Response:
{
  "playerId": "64abc123...",
  "username": "player1",
  "email": "player1@example.com",
  "nakamaUserId": "uuid-here",
  "nakamaUsername": "player1",
  "nakamaSessionToken": "token-here"
}
```

### 2. Player Management

#### Get Player Info
```http
GET /players/{playerId}

Response:
{
  "id": "64abc123...",
  "name": "player1",
  "email": "player1@example.com",
  "originalDeck": { ... },
  "currentDeck": { ... }
}
```

#### Get Player by Username
```http
GET /players/username/{username}

Response: Same as above
```

#### Create Player Deck
```http
POST /players/{playerId}/create-deck

Response: Updated player object with deck
```

### 3. Game Management (Local Mode)

#### Initialize Game
```http
POST /game/initialize
Content-Type: application/json

{
  "player1Id": "64abc123...",
  "player2Id": "64def456...",
  "deck1Id": "deck1-id",
  "deck2Id": "deck2-id"
}

Response:
{
  "id": "game-id",
  "state": "IN_PROGRESS",
  "currentPlayerId": "64abc123...",
  "board": {
    "width": 3,
    "height": 5,
    "pieces": {
      "1,3": "card-id-1",
      "1,1": "card-id-2"
    }
  },
  "currentPlayerHand": [...],
  "scores": {...}
}
```

#### Get Game State
```http
GET /game/{gameId}

Response: Complete game state object
```

#### Make Move (Place Card)
```http
POST /game/{gameId}/moves
Content-Type: application/json

{
  "playerId": "64abc123...",
  "card": {
    "id": "card-id",
    "name": "Card Name",
    "power": 5
  },
  "position": {
    "x": 2,
    "y": 3
  }
}

Response: Updated game state
```

#### Pass Turn
```http
POST /game/{gameId}/pass
Content-Type: application/json

{
  "playerId": "64abc123..."
}

Response: Updated game state
```

#### Request Win
```http
POST /game/{gameId}/request-win
Content-Type: application/json

{
  "playerId": "64abc123..."
}

Response: Updated game state with pending win request
```

#### Respond to Win Request
```http
POST /game/{gameId}/respond-win-request
Content-Type: application/json

{
  "playerId": "64abc123...",
  "accepted": true
}

Response: Updated game state (may be COMPLETED)
```

### 4. Online Game Management

#### Create Online Match
```http
POST /api/online-game/create
Content-Type: application/json

{
  "playerId": "64abc123..."
}

Response:
{
  "matchId": "ABC123",
  "status": "WAITING",
  "message": "Match created successfully. Share the code: ABC123"
}
```

#### Join Online Match
```http
POST /api/online-game/join/{matchId}
Content-Type: application/json

{
  "playerId": "64def456..."
}

Response:
{
  "matchId": "ABC123",
  "gameId": "game-id",
  "status": "IN_PROGRESS",
  "message": "Successfully joined match",
  "gameState": "IN_PROGRESS"
}
```

#### Get Match State
```http
GET /api/online-game/match/{matchId}/state

Response: Complete game state for the match
```

#### Send Game Action (WebSocket Alternative)
```http
POST /api/online-game/match/{matchId}/action
Content-Type: application/json

{
  "type": "PLACE_CARD",
  "playerId": "64abc123...",
  "card": { ... },
  "position": { "x": 2, "y": 3 }
}

Response: "Action sent successfully"
```

#### Leave All Matches (Testing/Development)
```http
POST /api/online-game/leave-all/{playerId}

Response:
{
  "success": true,
  "message": "Successfully left all matches",
  "playerId": "64abc123..."
}
```

### 5. WebSocket Connection

#### WebSocket Endpoint
```
ws://localhost:8080/ws/game
```

#### WebSocket Message Format
All messages follow this structure:
```json
{
  "type": "MESSAGE_TYPE",
  "data": { ... }
}
```

#### WebSocket Message Types

**Client to Server:**
```javascript
// Join Match
{
  "type": "JOIN_MATCH",
  "data": {
    "matchId": "ABC123",
    "playerId": "64abc123..."
  }
}

// Request Game State
{
  "type": "REQUEST_GAME_STATE",
  "data": {
    "matchId": "ABC123"
  }
}

// Game Action
{
  "type": "GAME_ACTION",
  "data": {
    "matchId": "ABC123",
    "action": {
      "type": "PLACE_CARD",
      "playerId": "64abc123...",
      "card": { ... },
      "targetPosition": { "x": 2, "y": 3 }
    }
  }
}
```

**Server to Client:**
```javascript
// Connection Success
{
  "type": "CONNECTION_SUCCESS",
  "data": {
    "message": "Connected to game server"
  }
}

// Join Success
{
  "type": "JOIN_SUCCESS",
  "data": {
    "matchId": "ABC123",
    "message": "Joined match successfully"
  }
}

// Game State Update
{
  "type": "GAME_STATE",
  "data": {
    "id": "game-id",
    "state": "IN_PROGRESS",
    "board": { ... },
    "currentPlayerId": "...",
    "currentPlayerHand": [...],
    // ... complete game state
  }
}

// Player Joined
{
  "type": "PLAYER_JOINED",
  "data": {
    "playerId": "64def456..."
  }
}

// Player Disconnected
{
  "type": "PLAYER_DISCONNECTED",
  "data": {
    "playerId": "64def456..."
  }
}
```

### 6. Admin & Utility Endpoints

#### Cleanup All Games/Matches
```http
POST /admin/cleanup/all

Response:
{
  "success": true,
  "clearedMatches": 5,
  "clearedGames": 3
}
```

#### Health Check
```http
GET /actuator/health

Response:
{
  "status": "UP"
}
```

## Complete Game Flow

### Local Game Flow
1. Authenticate both players via `/api/unified-auth/authenticate`
2. Ensure both players have decks (create if needed via `/players/{playerId}/create-deck`)
3. Initialize game via `/game/initialize`
4. Game loop:
   - Get current state via `/game/{gameId}`
   - Current player makes move via `/game/{gameId}/moves` or passes via `/game/{gameId}/pass`
   - Repeat until game ends
5. Handle win requests if needed

### Online Game Flow
1. Player 1 authenticates via `/api/unified-auth/authenticate`
2. Player 1 creates match via `/api/online-game/create` (gets match code)
3. Player 1 connects to WebSocket and joins match
4. Player 2 authenticates
5. Player 2 joins match via `/api/online-game/join/{matchId}`
6. Player 2 connects to WebSocket and joins match
7. Game automatically starts when both players are connected
8. Game loop (via WebSocket or REST):
   - Players receive game state updates
   - Current player makes moves
   - State updates broadcast to both players
9. Game continues until completion

### WebSocket Connection Flow
```javascript
// 1. Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080/ws/game');

// 2. Wait for connection
ws.onopen = () => {
  // 3. Join match
  ws.send(JSON.stringify({
    type: 'JOIN_MATCH',
    data: {
      matchId: 'ABC123',
      playerId: 'player-id'
    }
  }));
};

// 4. Handle messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch(message.type) {
    case 'GAME_STATE':
      // Update UI with new game state
      break;
    case 'PLAYER_JOINED':
      // Show opponent joined
      break;
    // ... handle other message types
  }
};

// 5. Send game actions
ws.send(JSON.stringify({
  type: 'GAME_ACTION',
  data: {
    matchId: 'ABC123',
    action: {
      type: 'PLACE_CARD',
      playerId: 'player-id',
      card: cardObject,
      targetPosition: { x: 2, y: 3 }
    }
  }
}));
```

## Error Handling

### Common HTTP Status Codes
- `200 OK` - Success
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `409 Conflict` - Action conflicts with game state
- `500 Internal Server Error` - Server error

### Common Error Scenarios
1. **Player not found**: Ensure player exists before game operations
2. **Invalid move**: Check valid moves before placing cards
3. **Match already started**: Second player join may fail via REST but WebSocket works
4. **Not player's turn**: Validate current player before actions

## CORS Configuration
The backend is configured to accept requests from:
- `http://localhost:3000` (default Next.js dev port)
- `http://localhost:3001` (alternative port)

Add `credentials: 'include'` to fetch requests if using cookies.

## Testing Endpoints

Use the provided test scripts:
- `test-online-game-new.sh` - Test backend APIs
- `test-websocket.js` - Test WebSocket connections
- `test-online-quick.sh` - Quick integration test

Or use curl/Postman:
```bash
# Create match
curl -X POST http://localhost:8080/api/online-game/create \
  -H "Content-Type: application/json" \
  -d '{"playerId": "64abc123..."}'

# Join match
curl -X POST http://localhost:8080/api/online-game/join/ABC123 \
  -H "Content-Type: application/json" \
  -d '{"playerId": "64def456..."}'
```