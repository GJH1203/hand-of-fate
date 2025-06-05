package com.cardgame.service;

import com.cardgame.model.Player;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.player.PlayerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for authentication-related service layer functionality.
 * Tests PlayerService methods used by AuthController to identify service-level bugs
 * and data consistency issues.
 */
@SpringBootTest
@ActiveProfiles("test")
class AuthServiceIntegrationTest {

    @Autowired
    private PlayerService playerService;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private DeckRepository deckRepository;

    private String testEmail;
    private String testUsername;
    private String testNakamaUserId;

    @BeforeEach
    void setUp() {
        playerRepository.deleteAll();
        cardRepository.deleteAll();
        deckRepository.deleteAll();

        setupDefaultCard();

        testEmail = "test@example.com";
        testUsername = "testuser";
        testNakamaUserId = "nakama-user-123";
    }

    /**
     * Creates the default card with ID "1" required by PlayerService for deck creation.
     * This card is used as a template for creating default player decks.
     */
    private void setupDefaultCard() {
        com.cardgame.model.Card defaultCard = new com.cardgame.model.Card();
        defaultCard.setId("1");
        defaultCard.setName("Default Card");
        defaultCard.setPower(5);
        cardRepository.save(defaultCard);
    }

    /**
     * Tests successful player creation with all required fields.
     * Verifies that a new player is properly initialized with default values.
     */
    @Test
    void testCreatePlayer_Success() {
        Player createdPlayer = playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        assertNotNull(createdPlayer.getId());
        assertEquals(testUsername, createdPlayer.getName());
        assertEquals(testEmail, createdPlayer.getEmail());
        assertEquals(testNakamaUserId, createdPlayer.getNakamaUserId());
        assertEquals(0, createdPlayer.getScore());
        assertEquals(0, createdPlayer.getLifetimeScore());
        assertNotNull(createdPlayer.getHand());
        assertTrue(createdPlayer.getHand().isEmpty());
        assertNotNull(createdPlayer.getPlacedCards());
        assertTrue(createdPlayer.getPlacedCards().isEmpty());
        assertNotNull(createdPlayer.getCurrentDeck());
    }

    /**
     * Tests player creation with duplicate username.
     * Should throw exception due to unique constraint on name field.
     */
    @Test
    void testCreatePlayer_DuplicateUsername_ThrowsException() {
        playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer(testUsername, "different@example.com", "different-nakama-id");
        });
    }

    /**
     * Tests player creation with duplicate email.
     * Should now throw an exception due to duplicate prevention fix.
     */
    @Test
    void testCreatePlayer_DuplicateEmail_ThrowsException() {
        playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer("differentuser", testEmail, "different-nakama-id");
        });

        long playersWithSameEmail = playerRepository.findAll().stream()
                .filter(p -> testEmail.equals(p.getEmail()))
                .count();
        assertEquals(1, playersWithSameEmail);
    }

    /**
     * Tests player creation with duplicate Nakama user ID.
     * Should now throw an exception as each Nakama user should map to exactly one Player.
     */
    @Test
    void testCreatePlayer_DuplicateNakamaUserId_ThrowsException() {
        playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer("differentuser", "different@example.com", testNakamaUserId);
        });

        long playersWithSameNakamaId = playerRepository.findAll().stream()
                .filter(p -> testNakamaUserId.equals(p.getNakamaUserId()))
                .count();
        assertEquals(1, playersWithSameNakamaId);
    }

    /**
     * Tests finding player by Nakama user ID.
     * Verifies the lookup mechanism used by AuthController.
     */
    @Test
    void testFindPlayerByNakamaUserId_Success() {
        Player createdPlayer = playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        Optional<Player> foundPlayer = playerService.findPlayerByNakamaUserId(testNakamaUserId);

        assertTrue(foundPlayer.isPresent());
        assertEquals(createdPlayer.getId(), foundPlayer.get().getId());
        assertEquals(testUsername, foundPlayer.get().getName());
        assertEquals(testEmail, foundPlayer.get().getEmail());
    }

    /**
     * Tests finding player by Nakama user ID when player doesn't exist.
     * Should return empty Optional.
     */
    @Test
    void testFindPlayerByNakamaUserId_NotFound() {
        Optional<Player> foundPlayer = playerService.findPlayerByNakamaUserId("non-existent-nakama-id");

        assertTrue(foundPlayer.isEmpty());
    }

    /**
     * Tests finding player by name functionality.
     * This method is used in some legacy code paths.
     */
    @Test
    void testFindPlayerByName_Success() {
        playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        Player foundPlayer = playerService.findPlayerByName(testUsername);

        assertNotNull(foundPlayer);
        assertEquals(testUsername, foundPlayer.getName());
        assertEquals(testEmail, foundPlayer.getEmail());
    }

    /**
     * Tests finding player by name when player doesn't exist.
     * Should return null based on current implementation.
     */
    @Test
    void testFindPlayerByName_NotFound() {
        Player foundPlayer = playerService.findPlayerByName("non-existent-user");

        assertNull(foundPlayer);
    }

    /**
     * Tests repository-level email lookup functionality.
     * Verifies that the PlayerRepository can find players by email.
     */
    @Test
    void testPlayerRepository_FindByEmail() {
        Player createdPlayer = playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        Optional<Player> foundPlayer = playerRepository.findByEmail(testEmail);

        assertTrue(foundPlayer.isPresent());
        assertEquals(createdPlayer.getId(), foundPlayer.get().getId());
        assertEquals(testEmail, foundPlayer.get().getEmail());
    }

    /**
     * Tests repository-level Nakama user ID lookup functionality.
     * Verifies that the PlayerRepository can find players by Nakama user ID.
     */
    @Test
    void testPlayerRepository_FindByNakamaUserId() {
        Player createdPlayer = playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        Optional<Player> foundPlayer = playerRepository.findByNakamaUserId(testNakamaUserId);

        assertTrue(foundPlayer.isPresent());
        assertEquals(createdPlayer.getId(), foundPlayer.get().getId());
        assertEquals(testNakamaUserId, foundPlayer.get().getNakamaUserId());
    }

    /**
     * Tests player creation with null or empty parameters.
     * Should now throw IllegalArgumentException for invalid input data.
     */
    @Test
    void testCreatePlayer_InvalidParameters() {
        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer(null, testEmail, testNakamaUserId);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer(testUsername, null, testNakamaUserId);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer(testUsername, testEmail, null);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer("", testEmail, testNakamaUserId);
        });
    }

    /**
     * Tests that player creation properly initializes the default deck.
     * Verifies that each new player gets a functional deck for gameplay.
     */
    @Test
    void testCreatePlayer_DefaultDeckInitialization() {
        Player createdPlayer = playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        assertNotNull(createdPlayer.getCurrentDeck());
        assertEquals(createdPlayer.getId(), createdPlayer.getCurrentDeck().getOwnerId());
        assertEquals(15, createdPlayer.getCurrentDeck().getCards().size());
        assertEquals(15, createdPlayer.getCurrentDeck().getRemainingCards());
        assertTrue(createdPlayer.getCurrentDeck().isValid());
        assertNull(createdPlayer.getOriginalDeck());
    }

    /**
     * Tests multiple player creation to verify system can handle concurrent registrations.
     * Identifies potential race conditions or data integrity issues.
     */
    @Test
    void testCreateMultiplePlayers_ConcurrentScenario() {
        Player player1 = playerService.createPlayer("user1", "user1@example.com", "nakama-1");
        Player player2 = playerService.createPlayer("user2", "user2@example.com", "nakama-2");
        Player player3 = playerService.createPlayer("user3", "user3@example.com", "nakama-3");

        assertNotEquals(player1.getId(), player2.getId());
        assertNotEquals(player2.getId(), player3.getId());
        assertNotEquals(player1.getId(), player3.getId());

        assertEquals(3, playerRepository.count());

        assertNotEquals(player1.getCurrentDeck().getId(), player2.getCurrentDeck().getId());
        assertNotEquals(player2.getCurrentDeck().getId(), player3.getCurrentDeck().getId());
    }

    /**
     * Tests player data persistence across service calls.
     * Verifies that player information is properly saved and retrievable.
     */
    @Test
    void testPlayerDataPersistence() {
        Player createdPlayer = playerService.createPlayer(testUsername, testEmail, testNakamaUserId);
        String playerId = createdPlayer.getId();

        Player retrievedPlayer = playerService.getPlayer(playerId);

        assertEquals(createdPlayer.getId(), retrievedPlayer.getId());
        assertEquals(createdPlayer.getName(), retrievedPlayer.getName());
        assertEquals(createdPlayer.getEmail(), retrievedPlayer.getEmail());
        assertEquals(createdPlayer.getNakamaUserId(), retrievedPlayer.getNakamaUserId());
        assertEquals(createdPlayer.getCurrentDeck().getId(), retrievedPlayer.getCurrentDeck().getId());
    }

    /**
     * Tests the relationship between Player and Deck entities.
     * Verifies that deck ownership and references are properly maintained.
     */
    @Test
    void testPlayerDeckRelationship() {
        Player createdPlayer = playerService.createPlayer(testUsername, testEmail, testNakamaUserId);

        assertNotNull(createdPlayer.getCurrentDeck());
        assertEquals(createdPlayer.getId(), createdPlayer.getCurrentDeck().getOwnerId());

        String deckId = createdPlayer.getCurrentDeck().getId();
        assertTrue(deckRepository.existsById(deckId));

        long deckCount = deckRepository.count();
        assertEquals(1, deckCount);
    }

    /**
     * Tests email format validation in player creation.
     * Should now throw an exception for invalid email formats.
     */
    @Test
    void testCreatePlayer_InvalidEmailFormat_ThrowsException() {
        String invalidEmail = "not-an-email";

        assertThrows(IllegalArgumentException.class, () -> {
            playerService.createPlayer(testUsername, invalidEmail, testNakamaUserId);
        });
    }

    /**
     * Tests username format validation in player creation.
     * Verifies handling of edge cases like special characters or very long usernames.
     */
    @Test
    void testCreatePlayer_EdgeCaseUsernames() {
        assertDoesNotThrow(() -> {
            playerService.createPlayer("user@#$%", testEmail, testNakamaUserId + "1");
        });

        String longUsername = "a".repeat(100);
        assertDoesNotThrow(() -> {
            playerService.createPlayer(longUsername, "long@example.com", testNakamaUserId + "2");
        });

        assertDoesNotThrow(() -> {
            playerService.createPlayer("123", "numbers@example.com", testNakamaUserId + "3");
        });
    }
}
