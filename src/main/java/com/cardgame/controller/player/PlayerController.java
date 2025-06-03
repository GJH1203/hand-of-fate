package com.cardgame.controller.player;

import java.util.List;
import com.cardgame.dto.PlayerDto;
import com.cardgame.model.Card;
import com.cardgame.model.Player;
import com.cardgame.service.player.PlayerService;
import org.springframework.http.ResponseEntity;
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

    @PostMapping
    public ResponseEntity<PlayerDto> createPlayer(@RequestParam String name) {
        Player player = playerService.createPlayer(name);
        return ResponseEntity.ok(playerService.getPlayerDto(player.getId()));
    }

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

    @GetMapping("/player/test")
    public String testEndpoint() {
        return "GameController is working!";
    }
}
