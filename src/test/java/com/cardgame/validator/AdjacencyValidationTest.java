package com.cardgame.validator;

import com.cardgame.dto.ImmutablePlayerAction;
import com.cardgame.dto.PlayerAction;
import com.cardgame.exception.game.InvalidMoveException;
import com.cardgame.model.*;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.manager.BoardManager;
import com.cardgame.service.player.DeckService;
import com.cardgame.service.player.PlayerService;
import com.cardgame.service.validator.DefaultGameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AdjacencyValidationTest {

    @Autowired
    private DefaultGameValidator gameValidator;

    @Autowired
    private PlayerService playerService;

    @Autowired
    private BoardManager boardManager;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private CardRepository cardRepository;

    private GameModel gameModel;
    private Player player1;
    private Player player2;
    private Card testCard;

    @BeforeEach
    void setUp() {
        // Clean up
        playerRepository.deleteAll();
        cardRepository.deleteAll();

        // Create test card
        testCard = new Card();
        testCard.setId("test_card_1");
        testCard.setName("Test Card");
        testCard.setPower(5);
        cardRepository.save(testCard);

        // Create test players
        player1 = new Player();
        player1.setId("player1");
        player1.setName("Player 1");
        player1.setHand(new ArrayList<>(List.of(testCard)));
        player1.setPlacedCards(new HashMap<>());
        playerRepository.save(player1);

        player2 = new Player();
        player2.setId("player2");
        player2.setName("Player 2");
        player2.setHand(new ArrayList<>());
        player2.setPlacedCards(new HashMap<>());
        playerRepository.save(player2);

        // Create game model
        gameModel = new GameModel();
        gameModel.setId("test_game");
        gameModel.setGameState(GameState.IN_PROGRESS);
        gameModel.setPlayerIds(Arrays.asList("player1", "player2"));
        gameModel.setCurrentPlayerId("player1");

        // Initialize board with initial cards at (1,3) and (1,1)
        Board board = new Board();
        board.placeCard(new Position(1, 3), "initial_card_p1");
        board.placeCard(new Position(1, 1), "initial_card_p2");
        gameModel.setBoard(board);

        // Set up player placed cards to track ownership
        player1.getPlacedCards().put("1,3", new Card("initial_card_p1", 1, "Initial P1"));
        player2.getPlacedCards().put("1,1", new Card("initial_card_p2", 1, "Initial P2"));
        playerRepository.save(player1);
        playerRepository.save(player2);
    }

    @Test
    void testValidMove_AdjacentToOwnCard() {
        // Player 1 places card adjacent to their card at (1,3)
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(0, 3)) // Adjacent to (1,3)
                .timestamp(System.currentTimeMillis())
                .build();

        // Should not throw exception
        assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action));
    }

    @Test
    void testInvalidMove_AdjacentToOpponentCard() {
        // Player 1 tries to place card adjacent only to opponent's card at (1,1)
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(0, 1)) // Adjacent to (1,1) which belongs to player2
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw InvalidMoveException
        InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                () -> gameValidator.validateMove(gameModel, action));
        assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
    }

    @Test
    void testInvalidMove_NotAdjacentToAnyCard() {
        // Player 1 tries to place card not adjacent to any card
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(2, 0)) // Not adjacent to any card
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw InvalidMoveException
        InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                () -> gameValidator.validateMove(gameModel, action));
        assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
    }

    @Test
    void testValidMove_DiagonalAdjacency() {
        // Player 1 places card diagonally adjacent to their card at (1,3)
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(0, 2)) // Diagonally adjacent to (1,3)
                .timestamp(System.currentTimeMillis())
                .build();

        // Should not throw exception - diagonal adjacency is valid
        assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action));
    }

    @Test
    void testValidMove_OrthogonalAdjacency() {
        // Test all four orthogonal positions
        Position[] orthogonalPositions = {
                new Position(1, 2), // Above (1,3)
                new Position(1, 4), // Below (1,3)
                new Position(0, 3), // Left of (1,3)
                new Position(2, 3)  // Right of (1,3)
        };

        for (Position pos : orthogonalPositions) {
            if (pos.getY() < 5 && pos.getX() < 3) { // Check board bounds
                PlayerAction action = ImmutablePlayerAction.builder()
                        .type(PlayerAction.ActionType.PLACE_CARD)
                        .playerId("player1")
                        .card(testCard)
                        .targetPosition(pos)
                        .timestamp(System.currentTimeMillis())
                        .build();

                assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                        "Should allow orthogonal placement at " + pos.toStorageString());
            }
        }
    }

    @Test
    void testInvalidMove_OccupiedPosition() {
        // Try to place on already occupied position
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(1, 3)) // Already has a card
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw InvalidMoveException
        InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                () -> gameValidator.validateMove(gameModel, action));
        assertEquals("Invalid or occupied position", exception.getMessage());
    }

    @Test
    void testInvalidMove_OutOfBounds() {
        // Try to place outside board bounds
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(3, 0)) // x=3 is out of bounds (board width is 3, so max x is 2)
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw InvalidMoveException
        InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                () -> gameValidator.validateMove(gameModel, action));
        assertEquals("Invalid or occupied position", exception.getMessage());
    }

    @Test
    void testValidMove_ChainOfCards() {
        // Player 1 places first card adjacent to initial position
        player1.getPlacedCards().put("0,3", new Card("card1", 2, "Card 1"));
        gameModel.getBoard().placeCard(new Position(0, 3), "card1");
        playerRepository.save(player1);

        // Now place another card adjacent to the newly placed card
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(0, 2)) // Adjacent to (0,3)
                .timestamp(System.currentTimeMillis())
                .build();

        // Should not throw exception - can build chains
        assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action));
    }

    @Test
    void testInvalidMove_CardNotInHand() {
        // Create a card that's not in player's hand
        Card notInHandCard = new Card("not_in_hand", 10, "Not in hand");

        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(notInHandCard)
                .targetPosition(new Position(0, 3))
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw InvalidMoveException
        InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                () -> gameValidator.validateMove(gameModel, action));
        assertEquals("Card not in player's hand", exception.getMessage());
    }

    @Test
    void testFirstMoveAfterInitialization() {
        // Clear player1's placed cards to simulate first move after initialization
        player1.setPlacedCards(new HashMap<>());
        playerRepository.save(player1);

        // Any empty position should be valid for first move after initialization
        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(2, 2)) // Any empty position
                .timestamp(System.currentTimeMillis())
                .build();

        // Should not throw exception - first move can be anywhere
        assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action));
    }

    @Test
    void testPlayerTurnValidation() {
        // Player 2 tries to move on Player 1's turn
        gameModel.setCurrentPlayerId("player1");

        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player2")
                .card(testCard)
                .targetPosition(new Position(0, 1))
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw InvalidMoveException
        InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                () -> gameValidator.validatePlayerTurn(gameModel, "player2"));
        assertEquals("Not your turn", exception.getMessage());
    }

    @Test
    void testGameNotInProgress() {
        // Set game to completed state
        gameModel.setGameState(GameState.COMPLETED);

        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(0, 3))
                .timestamp(System.currentTimeMillis())
                .build();

        // Should throw InvalidMoveException
        InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                () -> gameValidator.validatePlayerTurn(gameModel, "player1"));
        assertEquals("Game is not in progress", exception.getMessage());
    }

    @Test
    void testCornerCaseMultipleAdjacentCards() {
        // Set up a scenario where a position is adjacent to both player's and opponent's cards
        // Player1 card at (1,3), Player2 card at (1,1)
        // Position (1,2) is adjacent to both

        PlayerAction action = ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId("player1")
                .card(testCard)
                .targetPosition(new Position(1, 2)) // Adjacent to both players' cards
                .timestamp(System.currentTimeMillis())
                .build();

        // Should not throw exception - player has at least one adjacent card
        assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action));
    }
}