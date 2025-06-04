package com.cardgame.controller.player;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.cardgame.dto.PlayerDto;
import com.cardgame.model.Card;
import com.cardgame.model.Player;
import com.cardgame.service.player.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/players")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    // Removed auto-creation endpoint to prevent unauthorized player creation
    // Players should only be created through proper authentication flow

    @GetMapping("/{playerId}")
    public ResponseEntity<PlayerDto> getPlayer(@PathVariable String playerId) {
        return ResponseEntity.ok(playerService.getPlayerDto(playerId));
    }

    @GetMapping("/game/players/{playerId}/hand")
    public ResponseEntity<List<Card>> getPlayerHand(@PathVariable String playerId) {
        Player player = playerService.getPlayer(playerId);
        return ResponseEntity.ok(player.getHand());
    }

    @GetMapping("/by-name/{name}")
    public ResponseEntity<PlayerDto> getPlayerByName(@PathVariable String name) {
        Player player = playerService.findPlayerByName(name);
        if (player == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(playerService.getPlayerDto(player.getId()));
    }

    @GetMapping("/by-supabase-id/{supabaseUserId}")
    public ResponseEntity<com.cardgame.dto.PlayerResponse> getPlayerBySupabaseId(@PathVariable String supabaseUserId) {
        Optional<Player> player = playerService.findPlayerBySupabaseUserId(supabaseUserId);
        if (player.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Player foundPlayer = player.get();
        com.cardgame.dto.PlayerResponse response = new com.cardgame.dto.PlayerResponse(
            foundPlayer.getId(),
            foundPlayer.getName(),
            foundPlayer.getEmail(),
            foundPlayer.getSupabaseUserId()
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/player/test")
    public String testEndpoint() {
        return "GameController is working!";
    }
    
    @PostMapping("/create-test-player")
    public ResponseEntity<PlayerDto> createTestPlayer(@RequestParam String name) {
        try {
            Player testPlayer = playerService.createPlayer(name);
            return ResponseEntity.ok(playerService.getPlayerDto(testPlayer.getId()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/{playerId}/create-deck")
    public ResponseEntity<PlayerDto> createDeckForPlayer(@PathVariable String playerId) {
        try {
            Player player = playerService.getPlayer(playerId);
            if (player.getCurrentDeck() != null) {
                return ResponseEntity.ok(playerService.getPlayerDto(playerId));
            }
            
            // Create default deck for player
            playerService.createDefaultDeckForPlayer(playerId);
            return ResponseEntity.ok(playerService.getPlayerDto(playerId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/list")
    public ResponseEntity<List<Map<String, String>>> getAllPlayers() {
        try {
            List<Player> allPlayers = playerService.getAllPlayers();
            List<Map<String, String>> simplePlayers = allPlayers.stream()
                .map(player -> {
                    Map<String, String> playerInfo = new HashMap<>();
                    playerInfo.put("id", player.getId());
                    playerInfo.put("name", player.getName());
                    playerInfo.put("email", player.getEmail());
                    return playerInfo;
                })
                .collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(simplePlayers);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/all")
    public ResponseEntity<String> deleteAllPlayers() {
        try {
            List<Player> allPlayers = playerService.getAllPlayers();
            int playerCount = allPlayers.size();
            
            // Delete all players
            for (Player player : allPlayers) {
                playerService.deletePlayer(player.getId());
            }
            
            return ResponseEntity.ok("Deleted " + playerCount + " players successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to delete players: " + e.getMessage());
        }
    }
}
