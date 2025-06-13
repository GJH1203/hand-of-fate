package com.cardgame.integration;

import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.Player;
import com.cardgame.model.GameModel;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.repository.GameRepository;
import com.cardgame.service.DeckInitializationService;
import com.cardgame.service.player.PlayerService;
import com.cardgame.service.GameService;
import com.cardgame.dto.GameDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class VariedCardPowersTest {

    @Autowired
    private PlayerService playerService;

    @Autowired
    private DeckInitializationService deckInitializationService;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private GameService gameService;

    @Autowired
    private GameRepository gameRepository;

    @BeforeEach
    void setUp() {
        // Clean up any existing test data
        gameRepository.deleteAll();
        playerRepository.deleteAll();
        
        // Ensure the three card templates exist
        ensureCardTemplatesExist();
    }

    private void ensureCardTemplatesExist() {
        // Ensure Spark card exists
        if (!cardRepository.existsById("1")) {
            Card spark = new Card("1", 1, "Spark");
            cardRepository.save(spark);
        }
        
        // Ensure Lightning card exists
        if (!cardRepository.existsById("3")) {
            Card lightning = new Card("3", 3, "Lightning");
            cardRepository.save(lightning);
        }
        
        // Ensure Thunder card exists
        if (!cardRepository.existsById("5")) {
            Card thunder = new Card("5", 5, "Thunder");
            cardRepository.save(thunder);
        }
    }

    @Test
    void testNewPlayerReceivesExactly5Cards() {
        // Create a new player
        Player player = playerService.createPlayer(
            "TestPlayer",
            "test@example.com",
            "supabase-test-id",
            null
        );

        assertNotNull(player);
        assertNotNull(player.getCurrentDeck());

        // Get the player's deck
        Deck deck = player.getCurrentDeck();
        List<Card> cards = deck.getCards();

        // Verify deck has exactly 5 cards
        assertEquals(5, cards.size(), "Deck should have exactly 5 cards");

        // Count cards by power
        Map<Integer, Long> powerCounts = cards.stream()
            .collect(Collectors.groupingBy(Card::getPower, Collectors.counting()));

        // Verify distribution: 2 power-1, 2 power-3, 1 power-5
        assertEquals(3, powerCounts.size(), "Should have exactly 3 different power levels");
        assertEquals(2L, powerCounts.get(1), "Should have 2 cards with power 1");
        assertEquals(2L, powerCounts.get(3), "Should have 2 cards with power 3");
        assertEquals(1L, powerCounts.get(5), "Should have 1 card with power 5");

        // Verify card names and IDs
        List<Card> sparkCards = cards.stream()
            .filter(c -> c.getPower() == 1)
            .collect(Collectors.toList());
        
        List<Card> lightningCards = cards.stream()
            .filter(c -> c.getPower() == 3)
            .collect(Collectors.toList());
        
        List<Card> thunderCards = cards.stream()
            .filter(c -> c.getPower() == 5)
            .collect(Collectors.toList());

        // Check Spark cards
        assertEquals(2, sparkCards.size());
        for (Card card : sparkCards) {
            assertEquals("Spark", card.getName(), "Power 1 cards should be named 'Spark'");
            assertTrue(card.getId().startsWith("spark_"), 
                "Spark card IDs should start with 'spark_'");
        }

        // Check Lightning cards
        assertEquals(2, lightningCards.size());
        for (Card card : lightningCards) {
            assertEquals("Lightning", card.getName(), "Power 3 cards should be named 'Lightning'");
            assertTrue(card.getId().startsWith("lightning_"), 
                "Lightning card IDs should start with 'lightning_'");
        }

        // Check Thunder card
        assertEquals(1, thunderCards.size());
        Card thunderCard = thunderCards.get(0);
        assertEquals("Thunder", thunderCard.getName(), "Power 5 card should be named 'Thunder'");
        assertTrue(thunderCard.getId().startsWith("thunder_"), 
            "Thunder card ID should start with 'thunder_'");
    }

    @Test
    void testDeckInitializationServiceDirectly() {
        // Create a test player first
        Player player = new Player();
        player.setName("DirectTestPlayer");
        player.setEmail("direct@test.com");
        player = playerRepository.save(player);

        // Use DeckInitializationService directly
        Deck deck = deckInitializationService.createDefaultDeckForPlayer(player.getId());

        assertNotNull(deck);
        assertEquals(5, deck.getCards().size());

        // Verify the card distribution
        Map<Integer, List<Card>> cardsByPower = deck.getCards().stream()
            .collect(Collectors.groupingBy(Card::getPower));

        assertEquals(2, cardsByPower.get(1).size(), "Should have 2 power-1 cards");
        assertEquals(2, cardsByPower.get(3).size(), "Should have 2 power-3 cards");
        assertEquals(1, cardsByPower.get(5).size(), "Should have 1 power-5 card");

        // Print out the actual cards for debugging
        System.out.println("Created deck cards:");
        cardsByPower.forEach((power, cardList) -> {
            System.out.println("Power " + power + " cards:");
            cardList.forEach(card -> 
                System.out.println("  - " + card.getName() + " (ID: " + card.getId() + ")")
            );
        });
    }

    @Test
    void testCardTemplatesExist() {
        // Verify the three template cards exist in the database
        Card spark = cardRepository.findById("1").orElse(null);
        assertNotNull(spark, "Spark card (ID: 1) should exist");
        assertEquals("Spark", spark.getName());
        assertEquals(1, spark.getPower());

        Card lightning = cardRepository.findById("3").orElse(null);
        assertNotNull(lightning, "Lightning card (ID: 3) should exist");
        assertEquals("Lightning", lightning.getName());
        assertEquals(3, lightning.getPower());

        Card thunder = cardRepository.findById("5").orElse(null);
        assertNotNull(thunder, "Thunder card (ID: 5) should exist");
        assertEquals("Thunder", thunder.getName());
        assertEquals(5, thunder.getPower());
    }

    @Test
    void testGameInitializationWithNewDeckSystem() {
        // Create two players
        Player player1 = playerService.createPlayer(
            "Player1",
            "player1@example.com",
            "supabase-1",
            null
        );
        
        Player player2 = playerService.createPlayer(
            "Player2", 
            "player2@example.com",
            "supabase-2",
            null
        );

        // Initialize a game
        GameDto game = gameService.initializeGame(
            player1.getId(), 
            player2.getId(), 
            player1.getCurrentDeck().getId(), 
            player2.getCurrentDeck().getId()
        );
        
        assertNotNull(game);
        assertEquals("IN_PROGRESS", game.getState().toString());
        
        // Check that current player has 4 cards in hand (5 - 1 placed)
        assertEquals(4, game.getCurrentPlayerHand().size(), 
            "Player should have 4 cards in hand after 1 is placed on board");
        
        // Verify the hand has varied power cards
        Map<Integer, Long> handPowerCounts = game.getCurrentPlayerHand().stream()
            .collect(Collectors.groupingBy(card -> card.getPower(), Collectors.counting()));
        
        // The exact distribution depends on which card was randomly placed
        assertTrue(handPowerCounts.containsKey(1) || handPowerCounts.containsKey(3) || handPowerCounts.containsKey(5),
            "Hand should contain cards with different power values");
    }

    @Test
    void testAllCardsHaveUniqueIds() {
        // Create multiple players to ensure card IDs are unique across players
        Player player1 = playerService.createPlayer("UniqueTest1", "unique1@test.com", "sup1", null);
        Player player2 = playerService.createPlayer("UniqueTest2", "unique2@test.com", "sup2", null);
        Player player3 = playerService.createPlayer("UniqueTest3", "unique3@test.com", "sup3", null);
        
        // Collect all card IDs
        List<String> allCardIds = Arrays.asList(player1, player2, player3).stream()
            .flatMap(player -> player.getCurrentDeck().getCards().stream())
            .map(Card::getId)
            .collect(Collectors.toList());
        
        // Check for uniqueness
        long uniqueCount = allCardIds.stream().distinct().count();
        assertEquals(allCardIds.size(), uniqueCount, "All card IDs should be unique");
        
        // Verify total card count (3 players × 5 cards)
        assertEquals(15, allCardIds.size(), "Should have 15 total cards across 3 players");
    }

    @Test
    void testCardPowerCalculation() {
        Player player = playerService.createPlayer("PowerTest", "power@test.com", "sup-power", null);
        
        // Calculate total power in deck
        int totalPower = player.getCurrentDeck().getCards().stream()
            .mapToInt(Card::getPower)
            .sum();
        
        // Expected: 2×1 + 2×3 + 1×5 = 2 + 6 + 5 = 13
        assertEquals(13, totalPower, "Total deck power should be 13");
        
        // Verify average power
        double avgPower = player.getCurrentDeck().getCards().stream()
            .mapToInt(Card::getPower)
            .average()
            .orElse(0.0);
        
        assertEquals(2.6, avgPower, 0.01, "Average card power should be 2.6");
    }

    @Test
    void testRandomInitialCardPlacement() {
        // Run multiple games to verify randomness
        Map<Integer, Integer> placementCounts = new java.util.HashMap<>();
        placementCounts.put(1, 0);
        placementCounts.put(3, 0);
        placementCounts.put(5, 0);
        
        // Run 20 games to get a sample of random placements
        for (int i = 0; i < 20; i++) {
            // Create fresh players for each game
            Player p1 = playerService.createPlayer("RandTest1_" + i, "rand1_" + i + "@test.com", "sup-r1-" + i, null);
            Player p2 = playerService.createPlayer("RandTest2_" + i, "rand2_" + i + "@test.com", "sup-r2-" + i, null);
            
            // Initialize game
            GameDto game = gameService.initializeGame(
                p1.getId(), 
                p2.getId(), 
                p1.getCurrentDeck().getId(), 
                p2.getCurrentDeck().getId()
            );
            
            // Get the game model to check what cards were placed
            GameModel gameModel = gameRepository.findById(game.getId()).orElseThrow();
            
            // Check board positions (1,3) and (1,1) for placed cards
            String cardId1 = gameModel.getBoard().getPieces().get("1,3");
            String cardId2 = gameModel.getBoard().getPieces().get("1,1");
            
            // Get the placed cards from players
            Player updatedP1 = playerRepository.findById(p1.getId()).orElseThrow();
            Player updatedP2 = playerRepository.findById(p2.getId()).orElseThrow();
            
            // Count the powers of placed cards
            updatedP1.getPlacedCards().values().forEach(card -> 
                placementCounts.merge(card.getPower(), 1, Integer::sum));
            updatedP2.getPlacedCards().values().forEach(card -> 
                placementCounts.merge(card.getPower(), 1, Integer::sum));
        }
        
        // Verify that all power types were placed at least once
        assertTrue(placementCounts.get(1) > 0, "Power 1 cards should be placed sometimes");
        assertTrue(placementCounts.get(3) > 0, "Power 3 cards should be placed sometimes");
        assertTrue(placementCounts.get(5) > 0, "Power 5 cards should be placed sometimes");
        
        // Print distribution for manual verification
        System.out.println("Random placement distribution over 20 games:");
        placementCounts.forEach((power, count) -> 
            System.out.println("Power " + power + ": " + count + " times (" + (count/40.0*100) + "%)"));
    }

    @Test
    void testDeckValidation() {
        // Test that deck validation works correctly
        Player player = playerService.createPlayer("ValidationTest", "valid@test.com", "sup-valid", null);
        
        assertTrue(deckInitializationService.validateDeck(player.getCurrentDeck()),
            "Newly created deck should be valid");
        
        // Create an invalid deck with wrong number of cards
        Deck invalidDeck = new Deck();
        invalidDeck.setCards(Arrays.asList(
            new Card("test1", 1, "Test"),
            new Card("test2", 1, "Test"),
            new Card("test3", 1, "Test")
        )); // Only 3 cards instead of 5
        
        assertFalse(deckInitializationService.validateDeck(invalidDeck),
            "Deck with wrong number of cards should be invalid");
        
        // Test null deck
        assertFalse(deckInitializationService.validateDeck(null),
            "Null deck should be invalid");
        
        // Test deck with null cards
        Deck nullCardsDeck = new Deck();
        nullCardsDeck.setCards(null);
        assertFalse(deckInitializationService.validateDeck(nullCardsDeck),
            "Deck with null cards should be invalid");
    }
}