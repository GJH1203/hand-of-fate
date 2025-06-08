package com.cardgame.controller.admin;

import com.cardgame.repository.PlayerRepository;
import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.GameResultRepository;
import com.cardgame.repository.GameScoreRepository;
import com.cardgame.service.nakama.NakamaMatchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final PlayerRepository playerRepository;
    private final DeckRepository deckRepository;
    private final GameRepository gameRepository;
    private final CardRepository cardRepository;
    private final GameResultRepository gameResultRepository;
    private final GameScoreRepository gameScoreRepository;
    private final NakamaMatchService nakamaMatchService;

    @Autowired
    public AdminController(
            PlayerRepository playerRepository,
            DeckRepository deckRepository,
            GameRepository gameRepository,
            CardRepository cardRepository,
            GameResultRepository gameResultRepository,
            GameScoreRepository gameScoreRepository,
            NakamaMatchService nakamaMatchService) {
        this.playerRepository = playerRepository;
        this.deckRepository = deckRepository;
        this.gameRepository = gameRepository;
        this.cardRepository = cardRepository;
        this.gameResultRepository = gameResultRepository;
        this.gameScoreRepository = gameScoreRepository;
        this.nakamaMatchService = nakamaMatchService;
    }

    /**
     * Delete all player-related data from the database
     * WARNING: This will permanently delete all player data!
     */
    @DeleteMapping("/cleanup/all-players")
    public ResponseEntity<Map<String, Object>> deleteAllPlayerData(
            @RequestParam(value = "confirm", required = false) String confirm) {
        
        // Safety check - require confirmation parameter
        if (!"yes".equalsIgnoreCase(confirm)) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Please add ?confirm=yes to confirm deletion of all player data");
            response.put("warning", "This will delete ALL players, decks, games, and scores!");
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = new HashMap<>();
        
        try {
            // Count before deletion
            long playerCount = playerRepository.count();
            long deckCount = deckRepository.count();
            long gameCount = gameRepository.count();
            long gameResultCount = gameResultRepository.count();
            long gameScoreCount = gameScoreRepository.count();
            
            // Delete all data
            gameScoreRepository.deleteAll();
            gameResultRepository.deleteAll();
            gameRepository.deleteAll();
            deckRepository.deleteAll();
            playerRepository.deleteAll();
            
            // Prepare response
            result.put("success", true);
            result.put("deletedCounts", Map.of(
                "players", playerCount,
                "decks", deckCount,
                "games", gameCount,
                "gameResults", gameResultCount,
                "gameScores", gameScoreCount
            ));
            result.put("message", "All player data has been deleted successfully");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Failed to delete data: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }

    /**
     * Get current data counts
     */
    @GetMapping("/data-counts")
    public ResponseEntity<Map<String, Long>> getDataCounts() {
        Map<String, Long> counts = new HashMap<>();
        
        counts.put("players", playerRepository.count());
        counts.put("decks", deckRepository.count());
        counts.put("games", gameRepository.count());
        counts.put("gameResults", gameResultRepository.count());
        counts.put("gameScores", gameScoreRepository.count());
        counts.put("cards", cardRepository.count());
        
        return ResponseEntity.ok(counts);
    }
    
    /**
     * Get all players (for testing only)
     */
    @GetMapping("/all-players")
    public ResponseEntity<?> getAllPlayers() {
        return ResponseEntity.ok(playerRepository.findAll());
    }
    
    /**
     * Get player details with deck info
     */
    @GetMapping("/player/{playerId}/deck-info")
    public ResponseEntity<Map<String, Object>> getPlayerDeckInfo(@PathVariable String playerId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            var player = playerRepository.findById(playerId).orElse(null);
            if (player == null) {
                result.put("error", "Player not found");
                return ResponseEntity.notFound().build();
            }
            
            result.put("playerId", player.getId());
            result.put("playerName", player.getName());
            result.put("hasCurrentDeck", player.getCurrentDeck() != null);
            result.put("hasOriginalDeck", player.getOriginalDeck() != null);
            
            if (player.getCurrentDeck() != null) {
                result.put("currentDeckId", player.getCurrentDeck().getId());
            }
            if (player.getOriginalDeck() != null) {
                result.put("originalDeckId", player.getOriginalDeck().getId());
                result.put("originalDeckCardCount", player.getOriginalDeck().getCards().size());
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("error", "Failed to get player info: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }

    /**
     * Delete a specific player and all their related data
     */
    @DeleteMapping("/cleanup/player/{playerId}")
    public ResponseEntity<Map<String, Object>> deleteSpecificPlayer(
            @PathVariable String playerId,
            @RequestParam(value = "confirm", required = false) String confirm) {
        
        if (!"yes".equalsIgnoreCase(confirm)) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Please add ?confirm=yes to confirm deletion");
            response.put("playerId", playerId);
            return ResponseEntity.badRequest().body(response);
        }

        Map<String, Object> result = new HashMap<>();
        
        try {
            // Check if player exists
            if (!playerRepository.existsById(playerId)) {
                result.put("success", false);
                result.put("error", "Player not found: " + playerId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
            }
            
            // Delete player's games (where they are a participant)
            gameRepository.findAll().stream()
                .filter(game -> game.getPlayerIds().contains(playerId))
                .forEach(game -> gameRepository.delete(game));
            
            // Delete player's decks
            deckRepository.findByOwnerId(playerId)
                .forEach(deck -> deckRepository.delete(deck));
            
            // Delete player
            playerRepository.deleteById(playerId);
            
            result.put("success", true);
            result.put("message", "Player and related data deleted successfully");
            result.put("playerId", playerId);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Failed to delete player: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }
    
    /**
     * Clear all active matches and sessions
     * Use this when players get stuck in matches
     */
    @PostMapping("/cleanup/matches")
    public ResponseEntity<Map<String, Object>> clearAllMatches(
            @RequestParam(value = "confirm", required = false) String confirm) {
        
        if (!"yes".equalsIgnoreCase(confirm)) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Please add ?confirm=yes to confirm clearing all matches");
            response.put("warning", "This will disconnect all players and clear all active matches!");
            return ResponseEntity.badRequest().body(response);
        }
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Get count of active matches before clearing
            int activeMatchCount = nakamaMatchService.getAllActiveMatches().size();
            
            // Clear all matches
            nakamaMatchService.clearAllMatches();
            
            result.put("success", true);
            result.put("clearedMatches", activeMatchCount);
            result.put("message", "All active matches have been cleared");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Failed to clear matches: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }
    
    /**
     * Clear matches for a specific player
     */
    @PostMapping("/cleanup/player/{playerId}/matches")
    public ResponseEntity<Map<String, Object>> clearPlayerMatches(@PathVariable String playerId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            nakamaMatchService.clearPlayerMatches(playerId);
            
            result.put("success", true);
            result.put("playerId", playerId);
            result.put("message", "Matches cleared for player");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Failed to clear player matches: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }
    
    /**
     * Get all active matches (for debugging)
     */
    @GetMapping("/active-matches")
    public ResponseEntity<Map<String, Object>> getActiveMatches() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            var activeMatches = nakamaMatchService.getAllActiveMatches();
            
            result.put("count", activeMatches.size());
            result.put("matches", activeMatches);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("error", "Failed to get active matches: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }
    
    /**
     * Clear all in-progress games from database
     */
    @DeleteMapping("/cleanup/in-progress-games")
    public ResponseEntity<Map<String, Object>> clearInProgressGames(
            @RequestParam(value = "confirm", required = false) String confirm) {
        
        if (!"yes".equalsIgnoreCase(confirm)) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Please add ?confirm=yes to confirm clearing in-progress games");
            response.put("warning", "This will delete all games with state IN_PROGRESS!");
            return ResponseEntity.badRequest().body(response);
        }
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Find and count in-progress games
            var inProgressGames = gameRepository.findAll().stream()
                .filter(game -> "IN_PROGRESS".equals(game.getGameState().toString()))
                .toList();
            
            int gameCount = inProgressGames.size();
            
            // Delete them
            gameRepository.deleteAll(inProgressGames);
            
            result.put("success", true);
            result.put("deletedGames", gameCount);
            result.put("message", "All in-progress games have been deleted");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Failed to clear games: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }
    
    /**
     * QUICK CLEANUP - Clear all matches and in-progress games
     * Use this endpoint in Postman when players are stuck
     */
    @PostMapping("/cleanup/all")
    public ResponseEntity<Map<String, Object>> quickCleanup() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 1. Clear all active matches and sessions
            int activeMatchCount = nakamaMatchService.getAllActiveMatches().size();
            nakamaMatchService.clearAllMatches();
            
            // 2. Clear all in-progress games from database
            var inProgressGames = gameRepository.findAll().stream()
                .filter(game -> "IN_PROGRESS".equals(game.getGameState().toString()))
                .toList();
            int gameCount = inProgressGames.size();
            gameRepository.deleteAll(inProgressGames);
            
            result.put("success", true);
            result.put("clearedMatches", activeMatchCount);
            result.put("clearedGames", gameCount);
            result.put("message", "All matches and in-progress games have been cleared!");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Cleanup failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }
}
