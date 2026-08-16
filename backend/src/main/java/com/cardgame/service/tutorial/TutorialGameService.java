package com.cardgame.service.tutorial;

import com.cardgame.dto.GameDto;
import com.cardgame.dto.ImmutableOnboardingPlayerDto;
import com.cardgame.dto.ImmutablePlayerAction;
import com.cardgame.dto.OnboardingPlayerDto;
import com.cardgame.dto.PlayerAction;
import com.cardgame.model.*;
import com.cardgame.service.CardService;
import com.cardgame.service.GameService;
import com.cardgame.service.player.DeckService;
import com.cardgame.service.player.PlayerService;
import com.cardgame.service.tutorial.TutorialBotService.BotMove;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for managing tutorial games and onboarding flow
 */
@Service
public class TutorialGameService {
    private static final Logger logger = LoggerFactory.getLogger(TutorialGameService.class);
    private static final String BOT_PLAYER_NAME = "Tutorial Bot";
    private static final String BOT_EMAIL = "bot@tutorial.local";

    private final PlayerService playerService;
    private final DeckService deckService;
    private final GameService gameService;
    private final TutorialBotService tutorialBotService;
    private final CardService cardService;

    public TutorialGameService(PlayerService playerService,
                             DeckService deckService,
                             GameService gameService,
                             TutorialBotService tutorialBotService,
                             CardService cardService) {
        this.playerService = playerService;
        this.deckService = deckService;
        this.gameService = gameService;
        this.tutorialBotService = tutorialBotService;
        this.cardService = cardService;
    }

    /**
     * Check if player needs onboarding
     */
    public boolean playerNeedsOnboarding(String playerId) {
        try {
            Player player = playerService.getPlayer(playerId);
            return !player.hasCompletedOnboarding();
        } catch (Exception e) {
            logger.warn("Could not find player {}, assuming needs onboarding", playerId);
            return true;
        }
    }

    /**
     * Start a tutorial game for the player vs bot
     */
    public GameDto startTutorialGame(String playerId) {
        logger.info("Starting tutorial game for player: {}", playerId);

        // Ensure player has a deck
        Player player = playerService.getPlayer(playerId);
        if (player.getCurrentDeck() == null) {
            List<Card> tutorialCards = createTutorialDeck();
            Deck newDeck = deckService.createDeck(playerId, tutorialCards);
            player.setCurrentDeck(newDeck);
            playerService.savePlayer(player);
            logger.info("Created and assigned new deck {} to player {}", newDeck.getId(), playerId);
        }

        // Create or get bot player
        Player botPlayer = getOrCreateBotPlayer();

        // Initialize tutorial game using existing game service
        GameDto tutorialGame = gameService.initializeGame(
            playerId,
            botPlayer.getId(),
            player.getCurrentDeck().getId(),
            botPlayer.getCurrentDeck().getId()
        );

        // Mark this as a tutorial game
        player.setTutorialGameId(tutorialGame.getId());
        playerService.savePlayer(player);

        logger.info("Tutorial game created with ID: {} for player: {}", tutorialGame.getId(), playerId);

        return tutorialGame;
    }

    /**
     * Process a move in tutorial game (includes bot response)
     */
    public GameDto processTutorialMove(String gameId, PlayerAction playerAction) {
        logger.info("Processing tutorial move in game: {}", gameId);

        // Process player's move using existing game service
        GameDto updatedGame = gameService.processMove(gameId, playerAction);

        // Check if game is still in progress and it's bot's turn
        if (updatedGame.getState() == GameState.IN_PROGRESS) {
            String botPlayerId = getBotPlayerIdFromGame(updatedGame, playerAction.getPlayerId());
            
            if (botPlayerId != null && updatedGame.getCurrentPlayerId().equals(botPlayerId)) {
                // Make bot move after a short delay (simulate thinking)
                updatedGame = makeBotMove(updatedGame, botPlayerId);
            }
        }

        return updatedGame;
    }

    /**
     * Get tutorial game state
     */
    public GameDto getTutorialGame(String gameId) {
        return gameService.getGame(gameId);
    }

    /**
     * Complete tutorial and mark onboarding as finished
     */
    public OnboardingPlayerDto completeTutorial(String playerId, String gameId) {
        logger.info("Completing tutorial for player: {}", playerId);

        Player player = playerService.getPlayer(playerId);
        player.completeOnboarding();
        player.setTutorialGameId(null); // Clear tutorial game reference

        playerService.savePlayer(player);
        Player updatedPlayer = playerService.getPlayer(playerId); // Refresh after save

        return ImmutableOnboardingPlayerDto.builder()
            .id(updatedPlayer.getId())
            .name(updatedPlayer.getName())
            .email(updatedPlayer.getEmail())
            .hasCompletedOnboarding(updatedPlayer.hasCompletedOnboarding())
            .onboardingCompletedAt(updatedPlayer.getOnboardingCompletedAt())
            .tutorialGameId(updatedPlayer.getTutorialGameId())
            .build();
    }

    /**
     * Skip tutorial for experienced players
     */
    public OnboardingPlayerDto skipTutorial(String playerId) {
        logger.info("Skipping tutorial for player: {}", playerId);

        Player player = playerService.getPlayer(playerId);
        player.completeOnboarding();

        playerService.savePlayer(player);
        Player updatedPlayer = playerService.getPlayer(playerId); // Refresh after save

        return ImmutableOnboardingPlayerDto.builder()
            .id(updatedPlayer.getId())
            .name(updatedPlayer.getName())
            .email(updatedPlayer.getEmail())
            .hasCompletedOnboarding(updatedPlayer.hasCompletedOnboarding())
            .onboardingCompletedAt(updatedPlayer.getOnboardingCompletedAt())
            .tutorialGameId(updatedPlayer.getTutorialGameId())
            .build();
    }

    /**
     * Get tutorial progress for UI guidance
     */
    public Map<String, Object> getTutorialProgress(String gameId) {
        GameDto game = gameService.getGame(gameId);
        
        // Simple tutorial progress based on game state
        Map<String, Object> progress = new HashMap<>();
        progress.put("gameId", gameId);
        progress.put("gameState", game.getState());
        progress.put("currentStep", determineTutorialStep(game));
        progress.put("totalSteps", 5); // Simple 5-step tutorial
        
        return progress;
    }

    /**
     * Make bot move in tutorial game
     */
    private GameDto makeBotMove(GameDto game, String botPlayerId) {
        try {
            // Check if bot should pass
            if (tutorialBotService.shouldBotPass(gameService.getGameModel(game.getId()), botPlayerId)) {
                logger.info("Bot decides to pass");
                PlayerAction passAction = ImmutablePlayerAction.builder()
                    .type(PlayerAction.ActionType.PASS)
                    .playerId(botPlayerId)
                    .build();
                return gameService.processMove(game.getId(), passAction);
            }

            // Get bot move
            BotMove botMove = tutorialBotService.makeBotMove(
                gameService.getGameModel(game.getId()), 
                botPlayerId
            );

            if (botMove != null) {
                PlayerAction botAction = ImmutablePlayerAction.builder()
                    .type(PlayerAction.ActionType.PLACE_CARD)
                    .playerId(botPlayerId)
                    .card(botMove.getCard())
                    .targetPosition(botMove.getPosition())
                    .build();

                return gameService.processMove(game.getId(), botAction);
            } else {
                logger.warn("Bot could not make a move, passing");
                PlayerAction passAction = ImmutablePlayerAction.builder()
                    .type(PlayerAction.ActionType.PASS)
                    .playerId(botPlayerId)
                    .build();
                return gameService.processMove(game.getId(), passAction);
            }

        } catch (Exception e) {
            logger.error("Error making bot move", e);
            return game;
        }
    }

    /**
     * Get or create the tutorial bot player
     */
    private Player getOrCreateBotPlayer() {
        try {
            // Try to find existing bot player
            Player botPlayer = playerService.findPlayerByName(BOT_PLAYER_NAME);
            if (botPlayer.getCurrentDeck() == null) {
                List<Card> tutorialCards = createTutorialDeck();
                Deck newDeck = deckService.createDeck(botPlayer.getId(), tutorialCards);
                botPlayer.setCurrentDeck(newDeck);
                playerService.savePlayer(botPlayer);
                logger.info("Created and assigned new deck {} to bot player {}", newDeck.getId(), botPlayer.getId());
            }
            return botPlayer;
        } catch (Exception e) {
            // Create new bot player
            logger.info("Creating new bot player for tutorial");
            Player botPlayer = new Player();
            botPlayer.setName(BOT_PLAYER_NAME);
            botPlayer.setEmail(BOT_EMAIL);
            botPlayer.setHasCompletedOnboarding(true); // Bot doesn't need onboarding
            
            playerService.savePlayer(botPlayer);
            List<Card> tutorialCards = createTutorialDeck();
            Deck newDeck = deckService.createDeck(botPlayer.getId(), tutorialCards);
            botPlayer.setCurrentDeck(newDeck);
            playerService.savePlayer(botPlayer);
            logger.info("Created and assigned new deck {} to new bot player {}", newDeck.getId(), botPlayer.getId());
            
            return botPlayer;
        }
    }

    /**
     * Get bot player ID from game (the one that's not the human player)
     */
    private String getBotPlayerIdFromGame(GameDto game, String humanPlayerId) {
        return game.getPlayerIds().stream()
            .filter(id -> !id.equals(humanPlayerId))
            .findFirst()
            .orElse(null);
    }

    /**
     * Determine current tutorial step based on game state
     */
    private int determineTutorialStep(GameDto game) {
        if (game.getState() == GameState.INITIALIZED) {
            return 1; // "Welcome to the tutorial"
        } else if (game.getState() == GameState.IN_PROGRESS) {
            // Count total moves made
            int totalMoves = game.getBoard().getPieces() != null ? game.getBoard().getPieces().size() : 0;
            if (totalMoves == 0) return 2; // "Place your first card"
            if (totalMoves < 4) return 3; // "Continue playing"
            return 4; // "Almost done"
        } else if (game.getState() == GameState.COMPLETED) {
            return 5; // "Tutorial complete"
        }
        return 1;
    }

    /**
     * Create a standard tutorial deck with 5 cards
     */
    private List<Card> createTutorialDeck() {
        // Try to get existing cards first
        List<Card> availableCards = cardService.getAllCards().stream()
                .map(cardDto -> {
                    Card card = new Card();
                    card.setId(cardDto.getId());
                    card.setName(cardDto.getName());
                    card.setPower(cardDto.getPower());
                    return card;
                })
                .collect(Collectors.toList());

        // If we have at least 5 cards, use them
        if (availableCards.size() >= 5) {
            return availableCards.subList(0, 5);
        }

        // Otherwise, create default tutorial cards
        List<Card> tutorialCards = new ArrayList<>();
        
        // Create 5 basic tutorial cards with balanced powers
        String[] cardNames = {"Fire Bolt", "Lightning Strike", "Ice Shard", "Earth Spike", "Wind Slash"};
        int[] cardPowers = {3, 4, 2, 5, 3};
        
        for (int i = 0; i < 5; i++) {
            Card card = new Card();
            card.setId("tutorial_" + (i + 1));
            card.setName(cardNames[i]);
            card.setPower(cardPowers[i]);
            tutorialCards.add(card);
        }
        
        logger.info("Created {} tutorial cards for deck", tutorialCards.size());
        return tutorialCards;
    }
}