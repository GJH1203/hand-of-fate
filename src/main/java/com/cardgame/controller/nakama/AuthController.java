package com.cardgame.controller.nakama;

import com.cardgame.dto.nakama.AuthDto;
import com.cardgame.dto.nakama.ImmutableAuthDto;
import com.cardgame.dto.PlayerDto;
import com.cardgame.dto.CreatePlayerFromSupabaseRequest;
import com.cardgame.dto.PlayerResponse;
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
        // Validate input parameters
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Email cannot be empty")
                            .build());
        }
        
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Password cannot be empty")
                            .build());
        }
        
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Username cannot be empty")
                            .build());
        }

        // Check if email already exists in our system BEFORE calling Nakama
        if (playerService.findPlayerByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Registration failed: Email already exists")
                            .build());
        }

        // Check if username already exists in our system
        if (playerService.findPlayerByName(username) != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Registration failed: Username already exists")
                            .build());
        }

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
            try {
                // Create a new player in your system linked to the Nakama account
                player = playerService.createPlayer(username, email, session.getUserId());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ImmutableAuthDto.builder()
                                .isSuccess(false)
                                .message("Registration failed: " + e.getMessage())
                                .build());
            }
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
        // Validate input parameters
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Email cannot be empty")
                            .build());
        }
        
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Password cannot be empty")
                            .build());
        }

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

    @PostMapping("/create-from-supabase")
    public ResponseEntity<?> createPlayerFromSupabase(@RequestBody CreatePlayerFromSupabaseRequest request) {
        try {
            // Validate input
            if (request.getSupabaseUserId() == null || request.getSupabaseUserId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Supabase user ID is required");
            }
            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Email is required");
            }
            if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Username is required");
            }
            
            // Check if player already exists
            Optional<Player> existingPlayer = playerService.findPlayerBySupabaseUserId(request.getSupabaseUserId());
            if (existingPlayer.isPresent()) {
                return ResponseEntity.ok(convertPlayerToResponse(existingPlayer.get()));
            }
            
            // Create new player
            Player newPlayer = playerService.createPlayerFromSupabase(
                request.getUsername(), 
                request.getEmail(), 
                request.getSupabaseUserId()
            );
            
            return ResponseEntity.ok(convertPlayerToResponse(newPlayer));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Failed to create player: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Internal server error");
        }
    }
    
    private PlayerResponse convertPlayerToResponse(Player player) {
        return new PlayerResponse(
            player.getId(),
            player.getName(),
            player.getEmail(),
            player.getSupabaseUserId()
        );
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
