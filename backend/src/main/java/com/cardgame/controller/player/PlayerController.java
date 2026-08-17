package com.cardgame.controller.player;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.cardgame.dto.PlayerDto;
import com.cardgame.model.Card;
import com.cardgame.model.Player;
import com.cardgame.security.CurrentUser;
import com.cardgame.service.player.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
    private final CurrentUser currentUser;

    public PlayerController(PlayerService playerService, CurrentUser currentUser) {
        this.playerService = playerService;
        this.currentUser = currentUser;
    }

    // Removed auto-creation endpoint to prevent unauthorized player creation
    // Players should only be created through proper authentication flow

    /** A player's own record. It carries their deck, so it is not somebody else's to read. */
    @GetMapping("/{playerId}")
    public ResponseEntity<PlayerDto> getPlayer(@PathVariable String playerId) {
        currentUser.requireSelf(playerId);
        return ResponseEntity.ok(playerService.getPlayerDto(playerId));
    }

    /**
     * Look up an opponent by username, which is how local hot-seat mode finds the other
     * seat and the only reason this endpoint exists.
     *
     * <p>It still answers with the full PlayerDto, so a signed-in user can see more of a
     * stranger than they need to — less than it used to, now that a hand is not on the
     * player, but still their deck and their lifetime score. Narrowing it means giving
     * hot-seat a shape of its own.
     */
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
        if (!currentUser.isAdmin() && !supabaseUserId.equals(currentUser.supabaseUserId())) {
            throw new AccessDeniedException("You may only look up your own account");
        }
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

    // Test endpoints removed for production security
    // Use proper authentication flow to create players
    
    @DeleteMapping("/{playerId}")
    public ResponseEntity<String> deletePlayerById(@PathVariable String playerId) {
        currentUser.requireSelf(playerId);
        try {
            // Check if player exists first
            Player player = playerService.getPlayer(playerId);
            
            // Delete the player
            playerService.deletePlayer(playerId);
            
            return ResponseEntity.ok("Player " + player.getName() + " (ID: " + playerId + ") deleted successfully");
        } catch (com.cardgame.exception.player.PlayerNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to delete player: " + e.getMessage());
        }
    }

    /** Admin-only; enforced in SecurityConfig. */
    @DeleteMapping("/all")
    public ResponseEntity<String> deleteAllPlayers() {
        try {
            List<Player> allPlayers = playerService.getAllPlayers();
            int playerCount = allPlayers.size();
            
            // Delete all players in batch for better performance
            playerService.deleteAllPlayers();
            
            return ResponseEntity.ok("Deleted " + playerCount + " players successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to delete players: " + e.getMessage());
        }
    }
}
