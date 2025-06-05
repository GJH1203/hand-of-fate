package com.cardgame.controller;

import com.cardgame.dto.nakama.AuthDto;
import com.cardgame.dto.nakama.ImmutableAuthDto;
import com.cardgame.dto.CreatePlayerFromSupabaseRequest;
import com.cardgame.model.Player;
import com.cardgame.service.nakama.NakamaAuthService;
import com.cardgame.service.player.PlayerService;
import com.heroiclabs.nakama.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Unified Authentication Controller
 * 
 * This controller implements the unified authentication workflow:
 * 1. Sign up creates a Supabase account (with email verification)
 * 2. After email verification, user data syncs to backend
 * 3. Upon first login after verification, a Nakama account is automatically created
 * 4. All subsequent logins use Supabase for auth, then retrieve Nakama session
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class UnifiedAuthController {
    private static final Logger logger = LoggerFactory.getLogger(UnifiedAuthController.class);

    private final NakamaAuthService nakamaAuthService;
    private final PlayerService playerService;

    @Autowired
    public UnifiedAuthController(NakamaAuthService nakamaAuthService, PlayerService playerService) {
        this.nakamaAuthService = nakamaAuthService;
        this.playerService = playerService;
    }

    /**
     * Step 1: Sign up - Frontend handles Supabase registration
     * This endpoint is called after email verification to create player in backend
     */
    @PostMapping("/sync-verified-user")
    public ResponseEntity<?> syncVerifiedUser(@RequestBody CreatePlayerFromSupabaseRequest request) {
        try {
            logger.info("Syncing verified Supabase user: {}", request.getSupabaseUserId());
            
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
                Player player = existingPlayer.get();
                
                // If player exists but no Nakama ID, create Nakama account
                if (player.getNakamaUserId() == null) {
                    Session nakamaSession = createNakamaAccount(player, request.getEmail());
                    if (nakamaSession != null) {
                        player.setNakamaUserId(nakamaSession.getUserId());
                        playerService.savePlayer(player);
                    }
                }
                
                return ResponseEntity.ok(buildAuthResponse(player));
            }
            
            // Create new player
            Player newPlayer = playerService.createPlayerFromSupabase(
                request.getUsername(), 
                request.getEmail(), 
                request.getSupabaseUserId()
            );
            
            // Create Nakama account for the new player
            Session nakamaSession = createNakamaAccount(newPlayer, request.getEmail());
            if (nakamaSession != null) {
                newPlayer.setNakamaUserId(nakamaSession.getUserId());
                playerService.savePlayer(newPlayer);
                
                return ResponseEntity.ok(buildAuthResponse(newPlayer, nakamaSession));
            }
            
            return ResponseEntity.ok(buildAuthResponse(newPlayer));
            
        } catch (IllegalArgumentException e) {
            logger.error("Failed to sync user: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Failed to sync user: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Internal error syncing user", e);
            return ResponseEntity.internalServerError().body("Internal server error");
        }
    }

    /**
     * Step 2: Login - Frontend authenticates with Supabase first
     * This endpoint retrieves player data and Nakama session for authenticated Supabase user
     */
    @PostMapping("/login-with-supabase")
    public ResponseEntity<AuthDto> loginWithSupabase(@RequestBody CreatePlayerFromSupabaseRequest request) {
        try {
            logger.info("Login attempt for Supabase user: {}", request.getSupabaseUserId());
            
            // Validate input
            if (request.getSupabaseUserId() == null || request.getSupabaseUserId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ImmutableAuthDto.builder()
                        .isSuccess(false)
                        .message("Supabase user ID is required")
                        .build());
            }
            
            // Find player by Supabase ID
            Optional<Player> playerOpt = playerService.findPlayerBySupabaseUserId(request.getSupabaseUserId());
            if (playerOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ImmutableAuthDto.builder()
                        .isSuccess(false)
                        .message("Player not found. Please complete registration first.")
                        .build());
            }
            
            Player player = playerOpt.get();
            
            // Ensure player has a deck
            if (player.getCurrentDeck() == null) {
                logger.info("Creating default deck for player: {}", player.getId());
                playerService.createDefaultDeckForPlayer(player.getId());
            }
            
            // If player doesn't have Nakama account yet, create one
            if (player.getNakamaUserId() == null) {
                logger.info("Creating Nakama account for player: {}", player.getId());
                Session nakamaSession = createNakamaAccount(player, request.getEmail());
                if (nakamaSession == null) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ImmutableAuthDto.builder()
                            .isSuccess(false)
                            .message("Failed to create game session")
                            .build());
                }
                player.setNakamaUserId(nakamaSession.getUserId());
                playerService.savePlayer(player);
                
                return ResponseEntity.ok(buildAuthResponse(player, nakamaSession));
            }
            
            // Player has Nakama account, create a new session
            Session nakamaSession = authenticateWithNakama(player);
            if (nakamaSession == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ImmutableAuthDto.builder()
                        .isSuccess(false)
                        .message("Failed to create game session")
                        .build());
            }
            
            return ResponseEntity.ok(buildAuthResponse(player, nakamaSession));
            
        } catch (Exception e) {
            logger.error("Login error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ImmutableAuthDto.builder()
                    .isSuccess(false)
                    .message("Internal server error")
                    .build());
        }
    }

    /**
     * Validate Nakama token (for game operations)
     */
    @GetMapping("/validate-nakama-token")
    public ResponseEntity<AuthDto> validateNakamaToken(@RequestHeader("Authorization") String token) {
        Session session = nakamaAuthService.getSessionFromToken(token);
        
        if (session == null || session.isExpired(new java.util.Date())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ImmutableAuthDto.builder()
                    .isSuccess(false)
                    .message("Invalid or expired token")
                    .build());
        }
        
        // Find player by Nakama user ID
        Optional<Player> player = playerService.findPlayerByNakamaUserId(session.getUserId());
        if (player.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ImmutableAuthDto.builder()
                    .isSuccess(false)
                    .message("Player not found")
                    .build());
        }
        
        return ResponseEntity.ok(buildAuthResponse(player.get(), session));
    }

    /**
     * Helper method to create or authenticate Nakama account for a player
     */
    private Session createNakamaAccount(Player player, String email) {
        try {
            // Generate a secure random password
            // In production, ensure the password is stored securely for reuse
            String nakamaPassword = generateSecureRandomPassword();
            
            // First try to authenticate (in case account already exists)
            Session session = nakamaAuthService.authenticateEmail(
                email, 
                nakamaPassword, 
                false, // don't create yet
                player.getName()
            );
            
            // If authentication failed, try to create new account
            if (session == null) {
                logger.info("Nakama account doesn't exist, creating new one for player: {}", player.getId());
                session = nakamaAuthService.authenticateEmail(
                    email, 
                    nakamaPassword, 
                    true, // create if missing
                    player.getName()
                );
            }
            
            if (session != null) {
                logger.info("Successfully authenticated/created Nakama account for player: {}", player.getId());
            } else {
                logger.error("Failed to create/authenticate Nakama account for player: {}", player.getId());
            }
            
            return session;
        } catch (Exception e) {
            logger.error("Error with Nakama account", e);
            return null;
        }
    }

    /**
     * Helper method to authenticate existing player with Nakama
     */
    private Session authenticateWithNakama(Player player) {
        try {
            String nakamaPassword = "nakama_" + player.getId() + "_secure";
            
            Session session = nakamaAuthService.authenticateEmail(
                player.getEmail(), 
                nakamaPassword, 
                false, // don't create, should already exist
                player.getName()
            );
            
            if (session != null) {
                logger.info("Successfully authenticated with Nakama for player: {}", player.getId());
            } else {
                logger.error("Failed to authenticate with Nakama for player: {}", player.getId());
            }
            
            return session;
        } catch (Exception e) {
            logger.error("Error authenticating with Nakama", e);
            return null;
        }
    }

    /**
     * Build auth response without Nakama session
     */
    private AuthDto buildAuthResponse(Player player) {
        return ImmutableAuthDto.builder()
                .isSuccess(true)
                .playerId(player.getId())
                .username(player.getName())
                .message("Player synced successfully")
                .build();
    }

    /**
     * Build auth response with Nakama session
     */
    private AuthDto buildAuthResponse(Player player, Session nakamaSession) {
        return ImmutableAuthDto.builder()
                .isSuccess(true)
                .token(nakamaSession.getAuthToken())
                .userId(nakamaSession.getUserId())
                .username(player.getName())
                .playerId(player.getId())
                .build();
    }
    
    /**
     * Cleanup duplicate players - ADMIN ONLY
     * This endpoint removes duplicate players keeping only the first one
     */
    @DeleteMapping("/cleanup-duplicates")
    public ResponseEntity<String> cleanupDuplicates() {
        try {
            List<Player> allPlayers = playerService.getAllPlayers();
            Map<String, List<Player>> playersBySupabaseId = new HashMap<>();
            Map<String, List<Player>> playersByEmail = new HashMap<>();
            
            // Group players by Supabase ID and email
            for (Player player : allPlayers) {
                if (player.getSupabaseUserId() != null && !player.getSupabaseUserId().trim().isEmpty()) {
                    playersBySupabaseId.computeIfAbsent(player.getSupabaseUserId(), k -> new ArrayList<>()).add(player);
                }
                if (player.getEmail() != null && !player.getEmail().trim().isEmpty()) {
                    playersByEmail.computeIfAbsent(player.getEmail().toLowerCase(), k -> new ArrayList<>()).add(player);
                }
            }
            
            int duplicatesRemoved = 0;
            
            // Remove duplicates by Supabase ID
            for (Map.Entry<String, List<Player>> entry : playersBySupabaseId.entrySet()) {
                List<Player> players = entry.getValue();
                if (players.size() > 1) {
                    logger.info("Found {} duplicate players with Supabase ID: {}", players.size(), entry.getKey());
                    // Keep the first player, delete the rest
                    for (int i = 1; i < players.size(); i++) {
                        logger.info("Removing duplicate player: {}", players.get(i).getId());
                        playerService.deletePlayer(players.get(i).getId());
                        duplicatesRemoved++;
                    }
                }
            }
            
            // Remove duplicates by email (if no Supabase ID)
            for (Map.Entry<String, List<Player>> entry : playersByEmail.entrySet()) {
                List<Player> players = entry.getValue();
                if (players.size() > 1) {
                    // Only process players without Supabase ID (legacy players)
                    List<Player> playersWithoutSupabaseId = players.stream()
                            .filter(p -> p.getSupabaseUserId() == null || p.getSupabaseUserId().trim().isEmpty())
                            .collect(Collectors.toList());
                    
                    if (playersWithoutSupabaseId.size() > 1) {
                        logger.info("Found {} duplicate legacy players with email: {}", playersWithoutSupabaseId.size(), entry.getKey());
                        // Keep the first player, delete the rest
                        for (int i = 1; i < playersWithoutSupabaseId.size(); i++) {
                            logger.info("Removing duplicate legacy player: {}", playersWithoutSupabaseId.get(i).getId());
                            playerService.deletePlayer(playersWithoutSupabaseId.get(i).getId());
                            duplicatesRemoved++;
                        }
                    }
                }
            }
            
            return ResponseEntity.ok("Cleanup completed. Removed " + duplicatesRemoved + " duplicate players.");
        } catch (Exception e) {
            logger.error("Error during cleanup", e);
            return ResponseEntity.internalServerError().body("Cleanup failed: " + e.getMessage());
        }
    }
}