package com.cardgame.controller.admin;

import com.cardgame.repository.PlayerRepository;
import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.GameResultRepository;
import com.cardgame.repository.GameScoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired
    public AdminController(
            PlayerRepository playerRepository,
            DeckRepository deckRepository,
            GameRepository gameRepository,
            CardRepository cardRepository,
            GameResultRepository gameResultRepository,
            GameScoreRepository gameScoreRepository) {
        this.playerRepository = playerRepository;
        this.deckRepository = deckRepository;
        this.gameRepository = gameRepository;
        this.cardRepository = cardRepository;
        this.gameResultRepository = gameResultRepository;
        this.gameScoreRepository = gameScoreRepository;
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
                return ResponseEntity.notFound().build();
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
}