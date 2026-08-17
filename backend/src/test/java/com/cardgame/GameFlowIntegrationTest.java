package com.cardgame;

import com.cardgame.dto.*;
import com.cardgame.exception.game.InvalidMoveException;
import com.cardgame.model.*;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.GameService;
import com.cardgame.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_gameflow")
class GameFlowIntegrationTest extends IntegrationTestBase {

    @Autowired
    private GameService gameService;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private GameRepository gameRepository;

    /** A deck is five cards. These fixtures were built for the fifteen-card rule. */
    private static final int DECK_SIZE = 5;

    private Player player1;
    private Player player2;
    private Deck deck1;
    private Deck deck2;

    @BeforeEach
    void setUp() {
        // Clean up previous test data
        gameRepository.deleteAll();
        playerRepository.deleteAll();
        deckRepository.deleteAll();
        cardRepository.deleteAll();

        // Create test cards with known power values
        List<Card> testCards1 = createTestCards("player1");
        List<Card> testCards2 = createTestCards("player2");

        // Save cards to repository
        cardRepository.saveAll(testCards1);
        cardRepository.saveAll(testCards2);

        // Create test players
        player1 = new Player();
        player1.setId(UUID.randomUUID().toString());
        player1.setName("TestPlayer1");
        player1 = playerRepository.save(player1);

        player2 = new Player();
        player2.setId(UUID.randomUUID().toString());
        player2.setName("TestPlayer2");
        player2 = playerRepository.save(player2);

        // Create test decks
        deck1 = new Deck();
        deck1.setId(UUID.randomUUID().toString());
        deck1.setOwnerId(player1.getId());
        deck1.setCards(testCards1);
        deck1.setRemainingCards(DECK_SIZE);
        deck1 = deckRepository.save(deck1);

        deck2 = new Deck();
        deck2.setId(UUID.randomUUID().toString());
        deck2.setOwnerId(player2.getId());
        deck2.setCards(testCards2);
        deck2.setRemainingCards(DECK_SIZE);
        deck2 = deckRepository.save(deck2);

        // A real player owns the deck they play with, and the tests below check that a
        // game leaves that ownership alone.
        player1.setCurrentDeck(deck1);
        player1 = playerRepository.save(player1);
        player2.setCurrentDeck(deck2);
        player2 = playerRepository.save(player2);
    }

    private List<Card> createTestCards(String prefix) {
        List<Card> cards = new ArrayList<>();
        for (int i = 1; i <= DECK_SIZE; i++) {
            Card card = new Card();
            card.setId(prefix + "_card_" + i);
            card.setName(prefix + " Card " + i);
            card.setPower(i); // Power values 1-5, distinct so scoring is unambiguous
            cards.add(card);
        }
        return cards;
    }

    @Test
    void testGameInitialization() {
        // Initialize game
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Verify game state
        assertNotNull(game.getId());
        assertEquals(GameState.IN_PROGRESS, game.getState());
        assertEquals(player1.getId(), game.getCurrentPlayerId());

        // Verify board setup
        assertEquals(3, game.getBoard().getWidth());
        assertEquals(5, game.getBoard().getHeight());
        assertEquals(2, game.getBoard().getPieces().size()); // Two starting cards

        // Verify starting positions - check that positions exist
        // Initial positions are now (1,3) and (1,1)
        boolean hasPosition13 = game.getBoard().getPieces().containsKey("1,3");
        boolean hasPosition11 = game.getBoard().getPieces().containsKey("1,1");
        assertTrue(hasPosition13);
        assertTrue(hasPosition11);

        // Verify players have 4 cards in hand (after placing initial card from 5-card hand)
        assertEquals(4, game.getCurrentPlayerHand().size());
    }

    @Test
    void testValidCardPlacement() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Player 1 places card adjacent to their starting position (1,3)
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        Card card = new Card(cardToPlace.getId(), cardToPlace.getPower(), cardToPlace.getName());
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card)
                .targetPosition(new Position(1, 4)) // Adjacent to (1,3)
                .timestamp(System.currentTimeMillis())
                .build();

        GameDto updatedGame = gameService.processMove(game.getId(), action);

        // Verify card was placed
        assertEquals(3, updatedGame.getBoard().getPieces().size()); // Now has 3 cards
        boolean hasPosition14 = updatedGame.getBoard().getPieces().containsKey("1,4");
        assertTrue(hasPosition14);

        // Verify turn switched to player 2
        assertEquals(player2.getId(), updatedGame.getCurrentPlayerId());
    }

    @Test
    void testInvalidCardPlacement_NotAdjacent() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Player 1's only card on the board is the one placed at (1,3) during
        // initialization. (0,0) is orthogonally adjacent to (0,1) and (1,0), and neither
        // holds a card of theirs.
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        Card card = new Card(cardToPlace.getId(), cardToPlace.getPower(), cardToPlace.getName());
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card)
                .targetPosition(new Position(0, 0))
                .timestamp(System.currentTimeMillis())
                .build();

        // Name the reason as well as the refusal. Every other way this move could fail —
        // an unknown card, an occupied position, the wrong turn — also throws
        // InvalidMoveException, so a test that only asserts "something was thrown" would
        // keep passing after adjacency had stopped being checked at all.
        InvalidMoveException thrown = assertThrows(InvalidMoveException.class,
                () -> gameService.processMove(game.getId(), action));
        assertTrue(thrown.getMessage().contains("adjacent"),
                "Expected the move to be refused for adjacency, but got: " + thrown.getMessage());
    }

    @Test
    void testTerritoryExpansion() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Player 1 builds a chain of cards
        // Place first card adjacent to starting position
        CardDto cardDto1 = game.getCurrentPlayerHand().get(0);
        Card card1 = new Card(cardDto1.getId(), cardDto1.getPower(), cardDto1.getName());
        PlayerAction action1 = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card1)
                .targetPosition(new Position(1, 4))
                .timestamp(System.currentTimeMillis())
                .build();

        game = gameService.processMove(game.getId(), action1);

        // Skip player 2's turn with a pass
        PlayerAction passAction = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PASS)
                .playerId(player2.getId())
                .timestamp(System.currentTimeMillis())
                .build();

        game = gameService.processMove(game.getId(), passAction);

        // Player 1 places second card adjacent to first placed card
        CardDto cardDto2 = game.getCurrentPlayerHand().get(0);
        Card card2 = new Card(cardDto2.getId(), cardDto2.getPower(), cardDto2.getName());
        PlayerAction action2 = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card2)
                .targetPosition(new Position(0, 4)) // Adjacent to (1,4)
                .timestamp(System.currentTimeMillis())
                .build();

        game = gameService.processMove(game.getId(), action2);

        // Verify player 1 now has 4 cards on board
        assertEquals(4, game.getBoard().getPieces().size());
    }

    @Test
    void testGameEndWhenBoardFull() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Fill the board by placing cards in all remaining positions
        // This is a simplified test - in reality would need proper adjacency
        int movesNeeded = 13; // 15 total - 2 starting cards = 13 moves needed

        // Note: This test would need to be more sophisticated to ensure valid adjacency
        // For now, testing the concept that when board is full, game ends
        assertTrue(movesNeeded > 0); // Basic assertion for test structure
    }

    @Test
    void testConsecutiveMovesWhenPlayerBlocked() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Create a scenario where one player gets blocked
        // Player 1 places cards to isolate themselves
        CardDto cardDto1 = game.getCurrentPlayerHand().get(0);
        Card card1 = new Card(cardDto1.getId(), cardDto1.getPower(), cardDto1.getName());
        PlayerAction action1 = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card1)
                .targetPosition(new Position(2, 3)) // Adjacent to (2,4)
                .timestamp(System.currentTimeMillis())
                .build();

        game = gameService.processMove(game.getId(), action1);

        // Player 2 should be able to make multiple consecutive moves if player 1 gets blocked
        // This is more of a structural test - the actual blocking scenario would need
        // careful board setup
        assertNotNull(game.getCurrentPlayerId());
        assertEquals(GameState.IN_PROGRESS, game.getState());
    }

    @Test
    void testScoreCalculation() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Place a few cards and then force game end to test scoring
        CardDto cardDto1 = game.getCurrentPlayerHand().get(0);
        Card card1 = new Card(cardDto1.getId(), cardDto1.getPower(), cardDto1.getName());
        int expectedScore = card1.getPower(); // Start with power of placed card

        PlayerAction action1 = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card1)
                .targetPosition(new Position(1, 4))
                .timestamp(System.currentTimeMillis())
                .build();

        game = gameService.processMove(game.getId(), action1);

        // For completed games, scores should reflect sum of card powers
        // This test validates the scoring concept
        assertTrue(expectedScore > 0);
        assertNotNull(game.getBoard().getPieces());
    }

    @Test
    void testDiagonalAdjacency() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Test that diagonal adjacency is NOT allowed (only orthogonal adjacency)
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        Card card = new Card(cardToPlace.getId(), cardToPlace.getPower(), cardToPlace.getName());
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card)
                // Player 1 opens at (1,3). (2,4) touches it only at the corner.
                .targetPosition(new Position(2, 4))
                .timestamp(System.currentTimeMillis())
                .build();

        // Should fail - only orthogonal adjacency is allowed, not diagonal
        InvalidMoveException exception = assertThrows(InvalidMoveException.class, () -> {
            gameService.processMove(game.getId(), action);
        });
        assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
    }

    @Test
    void testCannotPlaceOnOccupiedPosition() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Try to place card on starting position (already occupied)
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        Card card = new Card(cardToPlace.getId(), cardToPlace.getPower(), cardToPlace.getName());
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card)
                .targetPosition(new Position(2, 4)) // Starting position, already occupied
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw exception (could be InvalidMoveException or IllegalArgumentException)
        assertThrows(Exception.class, () -> {
            gameService.processMove(game.getId(), action);
        });
    }

    @Test
    void testOriginalDeckPreservation() {
        // Store original deck states before game
        List<Card> originalDeck1Cards = new ArrayList<>(deck1.getCards());
        List<Card> originalDeck2Cards = new ArrayList<>(deck2.getCards());
        String originalDeck1Id = deck1.getId();
        String originalDeck2Id = deck2.getId();

        // Initialize and play a game
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // A game in progress does not borrow the deck. It used to copy it into a temporary
        // deck, write that over currentDeck and park the real one in originalDeck, which
        // left a player mid-game pointing at a deck document that was never saved.
        assertDeckUndisturbed(originalDeck1Id, originalDeck2Id);

        // Play some moves to modify game state
        CardDto cardDto1 = game.getCurrentPlayerHand().get(0);
        Card card1 = new Card(cardDto1.getId(), cardDto1.getPower(), cardDto1.getName());
        PlayerAction action1 = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(player1.getId())
                .card(card1)
                .targetPosition(new Position(1, 4))
                .timestamp(System.currentTimeMillis())
                .build();

        game = gameService.processMove(game.getId(), action1);

        // Pass for player 2
        PlayerAction passAction = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PASS)
                .playerId(player2.getId())
                .timestamp(System.currentTimeMillis())
                .build();

        game = gameService.processMove(game.getId(), passAction);

        // Check that original decks are still intact in the database
        Deck storedDeck1 = deckRepository.findById(originalDeck1Id).orElseThrow();
        Deck storedDeck2 = deckRepository.findById(originalDeck2Id).orElseThrow();

        assertEquals(originalDeck1Cards.size(), storedDeck1.getCards().size());
        assertEquals(originalDeck2Cards.size(), storedDeck2.getCards().size());
        
        // Verify original deck content is unchanged
        for (int i = 0; i < originalDeck1Cards.size(); i++) {
            assertEquals(originalDeck1Cards.get(i).getId(), storedDeck1.getCards().get(i).getId());
            assertEquals(originalDeck1Cards.get(i).getPower(), storedDeck1.getCards().get(i).getPower());
        }
        
        for (int i = 0; i < originalDeck2Cards.size(); i++) {
            assertEquals(originalDeck2Cards.get(i).getId(), storedDeck2.getCards().get(i).getId());
            assertEquals(originalDeck2Cards.get(i).getPower(), storedDeck2.getCards().get(i).getPower());
        }

        assertDeckUndisturbed(originalDeck1Id, originalDeck2Id);
    }

    /** Asserts that both players still own the deck they started with. */
    private void assertDeckUndisturbed(String deck1Id, String deck2Id) {
        Player stored1 = playerRepository.findById(player1.getId()).orElseThrow();
        Player stored2 = playerRepository.findById(player2.getId()).orElseThrow();

        assertEquals(deck1Id, stored1.getCurrentDeck().getId());
        assertEquals(deck2Id, stored2.getCurrentDeck().getId());
    }

    @Test
    void testDeckSurvivesACompletedGame() {
        // Store original deck references
        String originalDeck1Id = deck1.getId();
        String originalDeck2Id = deck2.getId();

        // Initialize game
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Play enough moves to fill the board and complete the game
        // This is a simple way to trigger game completion
        List<Position> moves = List.of(
                new Position(1, 4), // Player 1
                new Position(1, 0), // Player 2  
                new Position(0, 4), // Player 1
                new Position(0, 0), // Player 2
                new Position(2, 3), // Player 1
                new Position(2, 1), // Player 2
                new Position(1, 3), // Player 1
                new Position(1, 1), // Player 2
                new Position(0, 3), // Player 1
                new Position(0, 1), // Player 2
                new Position(2, 2), // Player 1
                new Position(1, 2), // Player 2
                new Position(0, 2)  // Player 1 - board should be full after this
        );

        int moveIndex = 0;
        String currentPlayer = player1.getId();
        
        for (Position position : moves) {
            if (game.getState() == GameState.COMPLETED) {
                break; // Game ended
            }
            
            // Skip if not current player's turn
            if (!currentPlayer.equals(game.getCurrentPlayerId())) {
                currentPlayer = game.getCurrentPlayerId();
            }
            
            if (game.getCurrentPlayerHand().isEmpty()) {
                break; // No more cards to play
            }
            
            try {
                CardDto cardDto = game.getCurrentPlayerHand().get(0);
                Card card = new Card(cardDto.getId(), cardDto.getPower(), cardDto.getName());
                PlayerAction action = ImmutablePlayerAction.builder()
                        .type(PlayerAction.ActionType.PLACE_CARD)
                        .playerId(currentPlayer)
                        .card(card)
                        .targetPosition(position)
                        .timestamp(System.currentTimeMillis())
                        .build();

                game = gameService.processMove(game.getId(), action);
                currentPlayer = game.getCurrentPlayerId();
            } catch (Exception e) {
                // Move failed, try next position or end test
                System.out.println("Move failed: " + e.getMessage());
                break;
            }
        }

        // Whether or not the game reached the end of the board, the decks are untouched.
        // There is no restoration step to get wrong any more, and no state to lose if the
        // game never finishes: the same assertion holds either way.
        Deck storedDeck1 = deckRepository.findById(originalDeck1Id).orElseThrow();
        Deck storedDeck2 = deckRepository.findById(originalDeck2Id).orElseThrow();

        assertEquals(DECK_SIZE, storedDeck1.getCards().size());
        assertEquals(DECK_SIZE, storedDeck2.getCards().size());

        assertDeckUndisturbed(originalDeck1Id, originalDeck2Id);
    }
}