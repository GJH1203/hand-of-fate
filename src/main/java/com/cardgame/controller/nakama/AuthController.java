package com.cardgame.controller.nakama;

import com.cardgame.dto.nakama.AuthDto;
import com.cardgame.dto.nakama.ImmutableAuthDto;
import com.cardgame.dto.PlayerDto;
import com.cardgame.model.Player;
import com.cardgame.service.nakama.NakamaAuthService;
import com.cardgame.service.player.PlayerService;
import com.heroiclabs.nakama.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final NakamaAuthService nakamaAuthService;
    private final PlayerService playerService;

    @Autowired
    public AuthController(NakamaAuthService nakamaAuthService, PlayerService playerService) {
        this.nakamaAuthService = nakamaAuthService;
        this.playerService = playerService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDto> register(@RequestParam String email,
                                            @RequestParam String password,
                                            @RequestParam String username) {
        // First, authenticate/register with Nakama
        Session session = nakamaAuthService.authenticateEmail(email, password, true, username);

        if (session == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Registration failed")
                            .build());
        }

        // Check if a player already exists with this Nakama ID
        Optional<Player> existingPlayer = playerService.findPlayerByNakamaUserId(session.getUserId());

        Player player;
        if (existingPlayer.isPresent()) {
            player = existingPlayer.get();
        } else {
            // Create a new player in your system linked to the Nakama account
            player = playerService.createPlayer(username, email, session.getUserId());
        }

        // Return authentication info and player details
        return ResponseEntity.ok(ImmutableAuthDto.builder()
                .isSuccess(true)
                .token(session.getAuthToken())
                .userId(session.getUserId())
                .username(session.getUsername())
                .playerId(player.getId())
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto> login(@RequestParam String email,
                                         @RequestParam String password) {
        // Use email as the username parameter since Nakama requires a non-null value
        Session session = nakamaAuthService.authenticateEmail(email, password, false, email);

        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Invalid email or password")
                            .build());
        }

        // Rest of your login method remains the same
        Optional<Player> player = playerService.findPlayerByNakamaUserId(session.getUserId());

        if (player.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Player account not found")
                            .build());
        }

        return ResponseEntity.ok(ImmutableAuthDto.builder()
                .isSuccess(true)
                .token(session.getAuthToken())
                .userId(session.getUserId())
                .username(session.getUsername())
                .playerId(player.get().getId())
                .build());
    }

    @GetMapping("/validate")
    public ResponseEntity<AuthDto> validateToken(@RequestHeader("Authorization") String token) {
        Session session = nakamaAuthService.getSessionFromToken(token);

        if (session == null || session.isExpired(new Date(System.currentTimeMillis()))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Invalid or expired token")
                            .build());
        }

        // Look up the player by Nakama user ID
        Optional<Player> player = playerService.findPlayerByNakamaUserId(session.getUserId());

        if (player.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Player account not found")
                            .build());
        }

        return ResponseEntity.ok(ImmutableAuthDto.builder()
                .isSuccess(true)
                .token(session.getAuthToken())
                .userId(session.getUserId())
                .username(session.getUsername())
                .playerId(player.get().getId())
                .build());
    }
}
