package com.cardgame.controller.player;

import java.util.List;
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
