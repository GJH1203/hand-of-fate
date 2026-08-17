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
import com.cardgame.security.CurrentUser;
import com.cardgame.security.GameAccess;
import com.cardgame.service.GameService;
import com.cardgame.websocket.GameWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
    private final GameAccess gameAccess;
    private final CurrentUser currentUser;

    @Autowired
    private GameWebSocketHandler gameWebSocketHandler;

    public GameController(GameService gameService, GameAccess gameAccess, CurrentUser currentUser) {
        this.gameService = gameService;
        this.gameAccess = gameAccess;
        this.currentUser = currentUser;
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
        gameAccess.requireParticipant(gameId);
        GameDto game = gameService.getGame(gameId);
        return ResponseEntity.ok(game);
    }

    @PostMapping("/initialize")
    public ResponseEntity<GameDto> initializeGame(@RequestBody GameInitializationRequest request) {
        if (request.getPlayerIds().size() != 2 || request.getDeckIds().size() != 2) {
            return ResponseEntity.badRequest().build();
        }

        // You can start a game you are in. Anything else would let a caller seat two
        // other people at a board and hand out their decks. Checked outside the try so
        // the catch-all below cannot turn a 403 into a 500.
        if (!currentUser.isAdmin() && !request.getPlayerIds().contains(currentUser.requirePlayerId())) {
            throw new AccessDeniedException("You are not one of this game's players");
        }

        try {
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
        gameAccess.requireParticipant(gameId);
        GameDto game = gameService.getGame(gameId);
        String currentPlayerId = game.getCurrentPlayerId();
        return ResponseEntity.ok(currentPlayerId);
    }

    @PostMapping("/{gameId}/moves")
    public ResponseEntity<GameDto> makeMove(
            @PathVariable String gameId,
            @RequestBody PlayerMoveRequest moveRequest) {
        gameAccess.requireMayActAs(gameId, moveRequest.getPlayerId());
        PlayerAction action = convertToPlayerAction(moveRequest);
        return applyAndBroadcast(gameId, action);
    }

    @PostMapping("/{gameId}/pass")
    public ResponseEntity<GameDto> pass(
            @PathVariable String gameId,
            @RequestBody PassRequest passRequest) {
        gameAccess.requireMayActAs(gameId, passRequest.getPlayerId());
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PASS)
                .playerId(passRequest.getPlayerId())
                .timestamp(System.currentTimeMillis())
                .build();
        return applyAndBroadcast(gameId, action);
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
        gameAccess.requireMayActAs(gameId, request.getPlayerId());
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.REQUEST_WIN_CALCULATION)
                .playerId(request.getPlayerId())
                .timestamp(System.currentTimeMillis())
                .build();
        return applyAndBroadcast(gameId, action);
    }

    /**
     * Respond to a win calculation request
     */
    @PostMapping("/{gameId}/respond-win-request")
    public ResponseEntity<GameDto> respondToWinRequest(
            @PathVariable String gameId,
            @RequestBody WinResponseRequest request) {
        gameAccess.requireMayActAs(gameId, request.getPlayerId());
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.RESPOND_TO_WIN_REQUEST)
                .playerId(request.getPlayerId())
                .actionData(request.isAccepted())
                .timestamp(System.currentTimeMillis())
                .build();
        return applyAndBroadcast(gameId, action);
    }
    
    /**
     * Helper method to broadcast game updates via WebSocket for online games ONLY
     * This method is safe for local mode - it checks if the game is online before broadcasting
     */
    /**
     * Applies an action, tells everyone else about it, and answers the caller.
     *
     * <p>The answer is built for **whoever made the move**. It used to be built for
     * whoever's turn it had become, which after a move is the opponent — so a player
     * posting a move was handed their opponent's hand. Local hot-seat is the one case
     * where the old behaviour is the right one: the same screen belongs to the next
     * player as soon as the turn passes.
     *
     * <p>The game is read once. Applying it, deciding whether to broadcast and building
     * the views all work from that one copy; each of those three used to read it again.
     */
    private ResponseEntity<GameDto> applyAndBroadcast(String gameId, PlayerAction action) {
        GameModel updated = gameService.applyMove(gameId, action);

        boolean online = updated.getGameMode() == GameMode.ONLINE && updated.getNakamaMatchId() != null;
        if (online) {
            try {
                String matchId = updated.getNakamaMatchId().replace("nakama_", "");
                gameWebSocketHandler.broadcastGameUpdate(matchId, updated);
            } catch (Exception e) {
                // A failed broadcast must not fail the move, which is already saved.
                log.error("Failed to broadcast game update for game {}", gameId, e);
            }
        }

        String forPlayerId = online ? action.getPlayerId() : updated.getCurrentPlayerId();
        return ResponseEntity.ok(gameService.convertToDto(updated, forPlayerId));
    }
}
