package com.cardgame.controller;

import com.cardgame.dto.PlayerAction;
import com.cardgame.dto.online.CreateMatchRequest;
import com.cardgame.dto.online.JoinMatchRequest;
import com.cardgame.dto.online.MatchResponse;
import com.cardgame.model.GameModel;
import com.cardgame.service.nakama.NakamaMatchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/online-game")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}, allowCredentials = "true")
public class OnlineGameController {
    private static final Logger logger = LoggerFactory.getLogger(OnlineGameController.class);
    
    @Autowired
    private NakamaMatchService nakamaMatchService;
    
    /**
     * Create a new online match
     */
    @PostMapping("/create")
    public CompletableFuture<ResponseEntity<MatchResponse>> createMatch(@RequestBody CreateMatchRequest request) {
        logger.info("Creating online match for player: {}", request.getPlayerId());
        
        return nakamaMatchService.createMatch(request.getPlayerId())
            .thenApply(matchId -> {
                logger.info("Successfully created match with ID: {} for player: {}", matchId, request.getPlayerId());
                MatchResponse response = new MatchResponse();
                response.setMatchId(matchId);
                response.setStatus("WAITING");
                response.setMessage("Match created successfully. Share the code: " + matchId);
                return ResponseEntity.ok(response);
            })
            .exceptionally(ex -> {
                logger.error("Failed to create match for player: {}", request.getPlayerId(), ex);
                MatchResponse errorResponse = new MatchResponse();
                errorResponse.setStatus("ERROR");
                errorResponse.setMessage("Failed to create match: " + ex.getMessage());
                return ResponseEntity.internalServerError().body(errorResponse);
            });
    }
    
    /**
     * Join an existing online match
     */
    @PostMapping("/join/{matchId}")
    public CompletableFuture<ResponseEntity<MatchResponse>> joinMatch(
            @PathVariable String matchId,
            @RequestBody JoinMatchRequest request) {
        logger.info("Player {} joining match {}", request.getPlayerId(), matchId);
        
        return nakamaMatchService.joinMatch(request.getPlayerId(), matchId)
            .thenApply(game -> {
                MatchResponse response = new MatchResponse();
                response.setMatchId(matchId);
                response.setGameId(game.getId());
                response.setStatus("IN_PROGRESS");
                response.setMessage("Successfully joined match");
                response.setGameState(game.getGameState().toString());
                return ResponseEntity.ok(response);
            })
            .exceptionally(ex -> {
                logger.error("Failed to join match {}", matchId, ex);
                MatchResponse errorResponse = new MatchResponse();
                errorResponse.setStatus("ERROR");
                
                // Get the root cause
                Throwable rootCause = ex;
                while (rootCause.getCause() != null) {
                    rootCause = rootCause.getCause();
                }
                
                errorResponse.setMessage("Failed to join match: " + rootCause.getMessage());
                return ResponseEntity.badRequest().body(errorResponse);
            });
    }
    
    /**
     * Get the current state of a match
     */
    @GetMapping("/match/{matchId}/state")
    public ResponseEntity<?> getMatchState(@PathVariable String matchId) {
        try {
            GameModel game = nakamaMatchService.getMatchState(matchId);
            return ResponseEntity.ok(game);
        } catch (Exception e) {
            logger.error("Failed to get match state for {}", matchId, e);
            return ResponseEntity.badRequest().body("Match not found");
        }
    }
    
    /**
     * Send a game action in an online match
     */
    @PostMapping("/match/{matchId}/action")
    public CompletableFuture<ResponseEntity<String>> sendAction(
            @PathVariable String matchId,
            @RequestBody PlayerAction action) {
        logger.info("Player {} sending action in match {}", action.getPlayerId(), matchId);
        
        // Convert PlayerAction to Map for NakamaMatchService
        Map<String, Object> actionData = new HashMap<>();
        actionData.put("type", action.getType().toString());
        actionData.put("playerId", action.getPlayerId());
        if (action.getCard() != null) {
            actionData.put("card", action.getCard());
        }
        if (action.getTargetPosition() != null) {
            actionData.put("position", action.getTargetPosition());
        }
        
        return nakamaMatchService.sendGameAction(matchId, actionData)
            .thenApply(v -> ResponseEntity.ok("Action sent successfully"))
            .exceptionally(ex -> {
                logger.error("Failed to send action in match {}", matchId, ex);
                return ResponseEntity.internalServerError().body("Failed to send action: " + ex.getMessage());
            });
    }
    
    /**
     * Handle player disconnection
     */
    @PostMapping("/match/{matchId}/disconnect/{playerId}")
    public ResponseEntity<String> handleDisconnect(
            @PathVariable String matchId,
            @PathVariable String playerId) {
        logger.info("Player {} disconnecting from match {}", playerId, matchId);
        
        try {
            nakamaMatchService.handleDisconnection(playerId, matchId);
            return ResponseEntity.ok("Disconnected successfully");
        } catch (Exception e) {
            logger.error("Failed to handle disconnection", e);
            return ResponseEntity.internalServerError().body("Failed to disconnect: " + e.getMessage());
        }
    }
    
    /**
     * Leave all matches for a player (useful for testing)
     * This endpoint allows a player to cleanly leave all their matches before joining a new one
     */
    @PostMapping("/leave-all/{playerId}")
    public ResponseEntity<Map<String, Object>> leaveAllMatches(@PathVariable String playerId) {
        logger.info("Player {} leaving all matches", playerId);
        
        Map<String, Object> response = new HashMap<>();
        try {
            nakamaMatchService.clearPlayerMatches(playerId);
            response.put("success", true);
            response.put("message", "Successfully left all matches");
            response.put("playerId", playerId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to leave matches for player {}", playerId, e);
            response.put("success", false);
            response.put("error", "Failed to leave matches: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}