package com.cardgame.controller;

import com.cardgame.dto.CreateGameRequest;
import com.cardgame.dto.GameDto;
import com.cardgame.dto.ImmutableGameDto;
import com.cardgame.dto.ImmutablePlayerAction;
import com.cardgame.dto.PlayerAction;
import com.cardgame.dto.game.GameInitializationRequest;
import com.cardgame.dto.game.PassRequest;
import com.cardgame.dto.game.PlayerMoveRequest;
import com.cardgame.dto.game.WinRequestRequest;
import com.cardgame.dto.game.WinResponseRequest;
import com.cardgame.model.GameModel;
import com.cardgame.model.GameMode;
import com.cardgame.service.GameService;
import com.cardgame.websocket.GameWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/game")
public class GameController {

    private static final Logger log = LoggerFactory.getLogger(GameController.class.getName());

    private final GameService gameService;
    
    @Autowired
    private GameWebSocketHandler gameWebSocketHandler;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping("/create")
    public String testEndpoint() {
        return "GameController is working!";
    }

//    @PostMapping(value = "/create")
//    public GameDto createGame(@RequestBody CreateGameRequest request) {
//        return gameService.createGame(
//                request.getGameState()
//        );
//    }

    @GetMapping("/{gameId}")
    public ResponseEntity<GameDto> getGame(@PathVariable String gameId) {
        GameDto game = gameService.getGame(gameId);
        return ResponseEntity.ok(game);
    }

    @PostMapping("/initialize")
    public ResponseEntity<GameDto> initializeGame(@RequestBody GameInitializationRequest request) {
        try {
            if (request.getPlayerIds().size() != 2 || request.getDeckIds().size() != 2) {
                return ResponseEntity.badRequest().build();
            }

            GameDto gameDto = gameService.initializeGame(
                    request.getPlayerIds().get(0),
                    request.getPlayerIds().get(1),
                    request.getDeckIds().get(0),
                    request.getDeckIds().get(1)
            );
            return ResponseEntity.ok(gameDto);
        } catch (IllegalArgumentException e) {
            log.error("Validation error during game initialization", e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Unexpected error during game initialization", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{gameId}/current-player")
    public ResponseEntity<String> getCurrentPlayer(@PathVariable String gameId) {
        GameDto game = gameService.getGame(gameId);
        String currentPlayerId = game.getCurrentPlayerId();
        return ResponseEntity.ok(currentPlayerId);
    }

    @PostMapping("/{gameId}/moves")
    public ResponseEntity<GameDto> makeMove(
            @PathVariable String gameId,
            @RequestBody PlayerMoveRequest moveRequest) {
        PlayerAction action = convertToPlayerAction(moveRequest);
        GameDto updatedGame = gameService.processMove(gameId, action);
        
        // Broadcast the update via WebSocket for online games
        broadcastGameUpdateIfOnline(gameId, updatedGame);
        
        return ResponseEntity.ok(updatedGame);
    }

    @PostMapping("/{gameId}/pass")
    public ResponseEntity<GameDto> pass(
            @PathVariable String gameId,
            @RequestBody PassRequest passRequest) {
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PASS)
                .playerId(passRequest.getPlayerId())
                .timestamp(System.currentTimeMillis())
                .build();
        GameDto updatedGame = gameService.processMove(gameId, action);
        
        // Broadcast the update via WebSocket for online games
        broadcastGameUpdateIfOnline(gameId, updatedGame);
        
        return ResponseEntity.ok(updatedGame);
    }

    private PlayerAction convertToPlayerAction(PlayerMoveRequest moveRequest) {
        return ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(moveRequest.getPlayerId())
                .card(moveRequest.getCard())
                .targetPosition(moveRequest.getPosition())
                .timestamp(System.currentTimeMillis())
                .build();
    }

//    /**
//     * Get a formatted text representation of the game results.
//     */
//    @GetMapping("/{gameId}/results")
//    public ResponseEntity<String> getFormattedGameResults(@PathVariable String gameId) {
//        String formattedResults = gameService.getGameResults(gameId);
//        return ResponseEntity.ok(formattedResults);
//    }


    /**
     * Request early win calculation
     */
    @PostMapping("/{gameId}/request-win")
    public ResponseEntity<GameDto> requestWinCalculation(
            @PathVariable String gameId,
            @RequestBody WinRequestRequest request) {
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.REQUEST_WIN_CALCULATION)
                .playerId(request.getPlayerId())
                .timestamp(System.currentTimeMillis())
                .build();
        GameDto updatedGame = gameService.processMove(gameId, action);
        
        // Broadcast the update via WebSocket for online games
        broadcastGameUpdateIfOnline(gameId, updatedGame);
        
        return ResponseEntity.ok(updatedGame);
    }

    /**
     * Respond to a win calculation request
     */
    @PostMapping("/{gameId}/respond-win-request")
    public ResponseEntity<GameDto> respondToWinRequest(
            @PathVariable String gameId,
            @RequestBody WinResponseRequest request) {
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.RESPOND_TO_WIN_REQUEST)
                .playerId(request.getPlayerId())
                .actionData(request.isAccepted())
                .timestamp(System.currentTimeMillis())
                .build();
        GameDto updatedGame = gameService.processMove(gameId, action);
        
        // Broadcast the update via WebSocket for online games
        broadcastGameUpdateIfOnline(gameId, updatedGame);
        
        return ResponseEntity.ok(updatedGame);
    }
    
    /**
     * Helper method to broadcast game updates via WebSocket for online games ONLY
     * This method is safe for local mode - it checks if the game is online before broadcasting
     */
    private void broadcastGameUpdateIfOnline(String gameId, GameDto updatedGame) {
        try {
            // Get the game model to check if it's an online game
            GameModel gameModel = gameService.getGameModel(gameId);
            
            // SAFETY CHECK: Only broadcast for online games
            if (gameModel.getGameMode() == GameMode.ONLINE && gameModel.getNakamaMatchId() != null) {
                // Extract match ID from Nakama match ID (format: "nakama_XXXXXX")
                String matchId = gameModel.getNakamaMatchId().replace("nakama_", "");
                
                // Broadcast to all players in the match
                // The WebSocket handler will take care of sending to all connected sessions
                gameWebSocketHandler.broadcastGameUpdate(matchId, updatedGame);
                
                log.info("Broadcasted game update for online match {} after REST API move", matchId);
            } else {
                // Local mode game - no broadcast needed
                log.debug("Game {} is in local mode, skipping WebSocket broadcast", gameId);
            }
        } catch (Exception e) {
            log.error("Failed to broadcast game update for game {}", gameId, e);
            // Don't fail the request if broadcast fails - this ensures local mode continues to work
        }
    }
}
