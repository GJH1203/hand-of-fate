package com.cardgame.controller.tutorial;

import com.cardgame.dto.GameDto;
import com.cardgame.dto.OnboardingPlayerDto;
import com.cardgame.dto.PlayerAction;
import com.cardgame.service.tutorial.TutorialGameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for tutorial and onboarding functionality
 */
@RestController
@RequestMapping("/api/tutorial")
public class TutorialController {
    private static final Logger logger = LoggerFactory.getLogger(TutorialController.class);
    
    private final TutorialGameService tutorialGameService;

    public TutorialController(TutorialGameService tutorialGameService) {
        this.tutorialGameService = tutorialGameService;
    }

    /**
     * Check if player needs onboarding
     */
    @GetMapping("/check-onboarding/{playerId}")
    public ResponseEntity<Map<String, Object>> checkOnboardingStatus(@PathVariable String playerId) {
        try {
            logger.info("Checking onboarding status for player: {}", playerId);
            
            boolean needsOnboarding = tutorialGameService.playerNeedsOnboarding(playerId);
            
            return ResponseEntity.ok(Map.of(
                "needsOnboarding", needsOnboarding,
                "playerId", playerId
            ));
            
        } catch (Exception e) {
            logger.error("Error checking onboarding status for player: {}", playerId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to check onboarding status"));
        }
    }

    /**
     * Start tutorial game for a player
     */
    @PostMapping("/start")
    public ResponseEntity<GameDto> startTutorial(@RequestBody Map<String, String> request) {
        try {
            String playerId = request.get("playerId");
            logger.info("Starting tutorial for player: {}", playerId);
            
            if (playerId == null || playerId.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            GameDto tutorialGame = tutorialGameService.startTutorialGame(playerId);
            
            return ResponseEntity.ok(tutorialGame);
            
        } catch (Exception e) {
            logger.error("Error starting tutorial", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Make a move in tutorial game
     */
    @PostMapping("/move/{gameId}")
    public ResponseEntity<GameDto> makeTutorialMove(
            @PathVariable String gameId,
            @RequestBody PlayerAction playerAction) {
        try {
            logger.info("Player move in tutorial game {}: {}", gameId, playerAction.getType());
            
            GameDto updatedGame = tutorialGameService.processTutorialMove(gameId, playerAction);
            
            return ResponseEntity.ok(updatedGame);
            
        } catch (Exception e) {
            logger.error("Error processing tutorial move for game: {}", gameId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get current tutorial game state
     */
    @GetMapping("/game/{gameId}")
    public ResponseEntity<GameDto> getTutorialGame(@PathVariable String gameId) {
        try {
            logger.info("Getting tutorial game state: {}", gameId);
            
            GameDto game = tutorialGameService.getTutorialGame(gameId);
            
            return ResponseEntity.ok(game);
            
        } catch (Exception e) {
            logger.error("Error getting tutorial game: {}", gameId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Complete tutorial and mark onboarding as finished
     */
    @PostMapping("/complete")
    public ResponseEntity<OnboardingPlayerDto> completeTutorial(@RequestBody Map<String, String> request) {
        try {
            String playerId = request.get("playerId");
            String gameId = request.get("gameId");
            
            logger.info("Completing tutorial for player: {} in game: {}", playerId, gameId);
            
            if (playerId == null || playerId.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            OnboardingPlayerDto updatedPlayer = tutorialGameService.completeTutorial(playerId, gameId);
            
            return ResponseEntity.ok(updatedPlayer);
            
        } catch (Exception e) {
            logger.error("Error completing tutorial", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Skip tutorial (for experienced players)
     */
    @PostMapping("/skip")
    public ResponseEntity<OnboardingPlayerDto> skipTutorial(@RequestBody Map<String, String> request) {
        try {
            String playerId = request.get("playerId");
            logger.info("Skipping tutorial for player: {}", playerId);
            
            if (playerId == null || playerId.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            OnboardingPlayerDto updatedPlayer = tutorialGameService.skipTutorial(playerId);
            
            return ResponseEntity.ok(updatedPlayer);
            
        } catch (Exception e) {
            logger.error("Error skipping tutorial", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get tutorial progress/steps for UI guidance
     */
    @GetMapping("/progress/{gameId}")
    public ResponseEntity<Map<String, Object>> getTutorialProgress(@PathVariable String gameId) {
        try {
            logger.info("Getting tutorial progress for game: {}", gameId);
            
            Map<String, Object> progress = tutorialGameService.getTutorialProgress(gameId);
            
            return ResponseEntity.ok(progress);
            
        } catch (Exception e) {
            logger.error("Error getting tutorial progress for game: {}", gameId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get tutorial progress"));
        }
    }
}