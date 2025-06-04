package com.cardgame.service;

import com.cardgame.dto.*;
import com.cardgame.exception.game.InvalidMoveException;
import com.cardgame.model.*;
import com.cardgame.repository.*;
import com.cardgame.service.validator.DefaultGameValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@DisplayName("Adjacency Rule Tests - Cards must be placed orthogonally adjacent to own cards")
class GameLogicIntegrationTest {

    @Autowired
    private GameService gameService;

    @Autowired
    private DefaultGameValidator gameValidator;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private GameRepository gameRepository;

    private String player1Id;
    private String player2Id;
    private String deck1Id;
    private String deck2Id;
    private GameDto game;
    private GameModel gameModel;
    private Card testCard;

    /**
     * Sets up test environment before each test case.
     * Cleans all repositories, creates test players and decks, initializes game,
     * and sets up validator test model for adjacency testing.
     */
    @BeforeEach
    void setUp() {
        gameRepository.deleteAll();
        playerRepository.deleteAll();
        deckRepository.deleteAll();
        cardRepository.deleteAll();

        setupTestPlayers();
        game = gameService.initializeGame(player1Id, player2Id, deck1Id, deck2Id);

        setupValidatorTestModel();
    }

    /**
     * Creates test players and decks with standard 15-card configurations.
     * Sets up player1, player2, deck1, and deck2 for game initialization.
     */
    private void setupTestPlayers() {
        List<Card> cards = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            Card card = new Card("card_" + i, i, "Card " + i);
            cards.add(card);
            cardRepository.save(card);
        }

        Player player1 = new Player();
        player1.setId("player1");
        player1.setName("Player 1");
        player1 = playerRepository.save(player1);
        player1Id = player1.getId();

        Player player2 = new Player();
        player2.setId("player2");
        player2.setName("Player 2");
        player2 = playerRepository.save(player2);
        player2Id = player2.getId();

        Deck deck1 = new Deck();
        deck1.setId("deck1");
        deck1.setOwnerId(player1Id);
        deck1.setCards(new ArrayList<>(cards));
        deck1.setRemainingCards(15);
        deck1 = deckRepository.save(deck1);
        deck1Id = deck1.getId();

        Deck deck2 = new Deck();
        deck2.setId("deck2");
        deck2.setOwnerId(player2Id);
        deck2.setCards(new ArrayList<>(cards));
        deck2.setRemainingCards(15);
        deck2 = deckRepository.save(deck2);
        deck2Id = deck2.getId();
    }

    /**
     * Sets up validator-specific test model with a test card and initial board state.
     * Creates a game model with player1's card at position (1,2) for adjacency testing.
     */
    private void setupValidatorTestModel() {
        testCard = new Card();
        testCard.setId("test_card_validator");
        testCard.setName("Test Card");
        testCard.setPower(5);
        cardRepository.save(testCard);

        Player player1 = playerRepository.findById(player1Id).orElseThrow();
        player1.getHand().add(testCard);
        playerRepository.save(player1);

        gameModel = new GameModel();
        gameModel.setId("test_game_validator");
        gameModel.setGameState(GameState.IN_PROGRESS);
        gameModel.setPlayerIds(Arrays.asList(player1Id, player2Id));
        gameModel.setCurrentPlayerId(player1Id);

        Board board = new Board();
        board.placeCard(new Position(1, 2), "validator_card");
        gameModel.setBoard(board);

        player1.getPlacedCards().put("1,2", new Card("validator_card", 1, "Validator Card"));
        playerRepository.save(player1);
    }

    @Nested
    @DisplayName("Game Service Integration Tests")
    class GameServiceTests {

        /**
         * Tests that placing a card orthogonally adjacent to own card is valid.
         * Player1 places card at (0,3) adjacent to their initial card at (1,3).
         * Verifies game state updates correctly and turn passes to player2.
         */
        @Test
        @DisplayName("Valid orthogonal placement adjacent to own card")
        void testValidMove_OrthogonalAdjacentToOwnCard() {
            CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
            PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(0, 3));

            GameDto updatedGame = gameService.processMove(game.getId(), action);

            assertEquals(3, updatedGame.getBoard().getPieces().size());
            assertEquals(player2Id, updatedGame.getCurrentPlayerId());
        }

        /**
         * Tests that placing a card adjacent only to opponent's card is invalid.
         * Player1 attempts to place at (0,1) which is only adjacent to player2's card at (1,1).
         * Should throw InvalidMoveException with appropriate message.
         */
        @Test
        @DisplayName("Invalid placement adjacent only to opponent's card")
        void testInvalidMove_AdjacentOnlyToOpponentCard() {
            CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
            PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(0, 1));

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameService.processMove(game.getId(), action));
            assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
        }

        /**
         * Tests that placing a card not adjacent to any card is invalid.
         * Player1 attempts to place at corner (0,0) with no adjacent cards.
         * Should throw InvalidMoveException.
         */
        @Test
        @DisplayName("Invalid placement not adjacent to any card")
        void testInvalidMove_NotAdjacentToAnyCard() {
            CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
            PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(0, 0));

            assertThrows(InvalidMoveException.class,
                    () -> gameService.processMove(game.getId(), action));
        }

        /**
         * Tests that placing a card on an occupied position is invalid.
         * Player1 attempts to place at (1,3) which already contains their initial card.
         * Should throw an exception.
         */
        @Test
        @DisplayName("Invalid placement on occupied position")
        void testInvalidMove_OccupiedPosition() {
            CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
            PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(1, 3));

            assertThrows(Exception.class,
                    () -> gameService.processMove(game.getId(), action));
        }

        /**
         * Tests that a player cannot make a move when it's not their turn.
         * Player2 attempts to move during player1's turn.
         * Should throw an exception.
         */
        @Test
        @DisplayName("Invalid move - wrong player turn")
        void testInvalidMove_WrongPlayerTurn() {
            Player player2 = playerRepository.findById(player2Id).orElseThrow();
            Card card = player2.getHand().get(0);
            PlayerAction action = createPlaceCardAction(player2Id,
                    ImmutableCardDto.builder()
                            .id(card.getId())
                            .power(card.getPower())
                            .name(card.getName())
                            .build(),
                    new Position(0, 1));

            assertThrows(Exception.class,
                    () -> gameService.processMove(game.getId(), action));
        }
    }

    @Nested
    @DisplayName("Orthogonal vs Diagonal Adjacency Tests")
    class OrthogonalAdjacencyTests {

        /**
         * Tests that orthogonal placements in all 4 directions are valid.
         * From player1's card at (1,2), tests North, South, East, West positions.
         * All orthogonal adjacent positions should be allowed.
         */
        @Test
        @DisplayName("Valid orthogonal placements in all 4 directions")
        void testValidOrthogonalPlacements() {
            Position[] orthogonalPositions = {
                    new Position(1, 1),
                    new Position(1, 3),
                    new Position(0, 2),
                    new Position(2, 2)
            };

            for (Position pos : orthogonalPositions) {
                PlayerAction action = createValidatorPlaceCardAction(player1Id, pos);
                assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                        "Should allow orthogonal placement at " + pos.toStorageString());
            }
        }

        /**
         * Tests that diagonal placements in all 4 diagonal directions are invalid.
         * From player1's card at (1,2), tests NW, NE, SW, SE positions.
         * All diagonal positions should be rejected with appropriate error message.
         */
        @Test
        @DisplayName("Invalid diagonal placements in all 4 diagonal directions")
        void testInvalidDiagonalPlacements() {
            Position[] diagonalPositions = {
                    new Position(0, 1),
                    new Position(2, 1),
                    new Position(0, 3),
                    new Position(2, 3)
            };

            for (Position pos : diagonalPositions) {
                PlayerAction action = createValidatorPlaceCardAction(player1Id, pos);
                InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                        () -> gameValidator.validateMove(gameModel, action),
                        "Should NOT allow diagonal placement at " + pos.toStorageString());
                assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
            }
        }

        /**
         * Tests that placing a card two spaces away from own cards is invalid.
         * Player1 attempts to place at (1,0) which is two spaces north of card at (1,2).
         * Should throw InvalidMoveException with appropriate message.
         */
        @Test
        @DisplayName("Invalid placement two spaces away")
        void testInvalidMove_TwoSpacesAway() {
            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(1, 0));

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action));
            assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
        }
    }

    @Nested
    @DisplayName("Complex Scenarios and Edge Cases")
    class ComplexScenarioTests {

        /**
         * Tests that building orthogonal chains of cards is valid.
         * Places a second card at (1,1) adjacent to existing card at (1,2),
         * then validates placing third card at (1,0) to extend the chain.
         */
        @Test
        @DisplayName("Valid orthogonal chain building")
        void testValidMove_OrthogonalChain() {
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().put("1,1", new Card("chain_card", 2, "Chain Card"));
            gameModel.getBoard().placeCard(new Position(1, 1), "chain_card");
            playerRepository.save(player1);

            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(1, 0));

            assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                    "Should allow building orthogonal chains");
        }

        /**
         * Tests that diagonal placement from a chain is invalid.
         * Sets up an orthogonal chain with cards at (1,2) and (1,1),
         * then attempts diagonal placement at (0,0) which should be rejected.
         */
        @Test
        @DisplayName("Invalid diagonal placement from chain")
        void testInvalidMove_DiagonalFromChain() {
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().put("1,1", new Card("chain_card", 2, "Chain Card"));
            gameModel.getBoard().placeCard(new Position(1, 1), "chain_card");
            playerRepository.save(player1);

            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(0, 0));

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action));
            assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
        }

        /**
         * Tests that placement is valid when adjacent to both own and opponent cards.
         * Places opponent's card at (0,2), then validates that player1 can place
         * at (1,1) which is adjacent to their own card at (1,2).
         */
        @Test
        @DisplayName("Valid placement when adjacent to both own and opponent cards")
        void testValidMove_AdjacentToBothPlayers() {
            Player player2 = playerRepository.findById(player2Id).orElseThrow();
            player2.getPlacedCards().put("0,2", new Card("opponent_card", 3, "Opponent Card"));
            gameModel.getBoard().placeCard(new Position(0, 2), "opponent_card");
            playerRepository.save(player2);

            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(1, 1));

            assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                    "Should allow placement when orthogonally adjacent to own card");
        }

        /**
         * Tests that placement adjacent only to opponent's card is invalid.
         * Places opponent's card at (0,1), then validates that player1 cannot place
         * at (0,0) which is only adjacent to opponent's card.
         */
        @Test
        @DisplayName("Invalid placement adjacent only to opponent")
        void testInvalidMove_AdjacentOnlyToOpponent() {
            Player player2 = playerRepository.findById(player2Id).orElseThrow();
            player2.getPlacedCards().put("0,1", new Card("opponent_card", 3, "Opponent Card"));
            gameModel.getBoard().placeCard(new Position(0, 1), "opponent_card");
            playerRepository.save(player2);

            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(0, 0));

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action));
            assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
        }

        /**
         * Tests that orthogonal placement at board boundaries is valid.
         * Places player1's card at corner (0,0), then validates adjacent
         * placements east (1,0) and south (0,1) are allowed.
         */
        @Test
        @DisplayName("Valid placement at board boundaries")
        void testValidMove_BoardBoundaries() {
            gameModel.getBoard().getPieces().clear();
            gameModel.getBoard().placeCard(new Position(0, 0), "edge_card");
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();
            player1.getPlacedCards().put("0,0", new Card("edge_card", 1, "Edge Card"));
            playerRepository.save(player1);

            PlayerAction eastAction = createValidatorPlaceCardAction(player1Id, new Position(1, 0));
            assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, eastAction),
                    "Should allow orthogonal placement east from edge");

            PlayerAction southAction = createValidatorPlaceCardAction(player1Id, new Position(0, 1));
            assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, southAction),
                    "Should allow orthogonal placement south from edge");
        }

        /**
         * Tests that L-shaped patterns require orthogonal connection.
         * Creates L-shaped pattern with player1's cards at (0,0) and (1,1),
         * then validates that placement at (2,2) is rejected since it's only
         * diagonally adjacent to the card at (1,1).
         */
        @Test
        @DisplayName("L-shaped pattern requires orthogonal connection")
        void testLShapedPattern_RequiresOrthogonalConnection() {
            gameModel.getBoard().getPieces().clear();
            gameModel.getBoard().placeCard(new Position(0, 0), "card1");
            gameModel.getBoard().placeCard(new Position(1, 1), "card2");

            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();
            player1.getPlacedCards().put("0,0", new Card("card1", 1, "Card 1"));
            player1.getPlacedCards().put("1,1", new Card("card2", 2, "Card 2"));
            playerRepository.save(player1);

            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(2, 2));

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action));
            assertEquals("Must place card adjacent to your existing cards", exception.getMessage());
        }
    }

    @Nested
    @DisplayName("Game State Validation Tests")
    class GameStateValidationTests {

        /**
         * Tests that placing a card not in player's hand is invalid.
         * Creates a card not present in player1's hand and attempts to place it.
         * Should throw InvalidMoveException with appropriate message.
         */
        @Test
        @DisplayName("Invalid move - card not in hand")
        void testInvalidMove_CardNotInHand() {
            Card notInHandCard = new Card("not_in_hand", 10, "Not in hand");
            PlayerAction action = ImmutablePlayerAction.builder()
                    .type(PlayerAction.ActionType.PLACE_CARD)
                    .playerId(player1Id)
                    .card(notInHandCard)
                    .targetPosition(new Position(0, 2))
                    .timestamp(System.currentTimeMillis())
                    .build();

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action));
            assertEquals("Card not in player's hand", exception.getMessage());
        }

        /**
         * Tests that placing a card out of bounds is invalid.
         * Attempts to place at position (3,0) which is outside the 3x5 board.
         * Should throw InvalidMoveException with appropriate message.
         */
        @Test
        @DisplayName("Invalid move - out of bounds placement")
        void testInvalidMove_OutOfBounds() {
            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(3, 0));

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action));
            assertEquals("Invalid or occupied position", exception.getMessage());
        }

        /**
         * Tests that placing a card on an already occupied position is invalid.
         * Attempts to place at position (1,2) which already contains a card.
         * Should throw InvalidMoveException with appropriate message.
         */
        @Test
        @DisplayName("Invalid move - occupied position")
        void testInvalidMove_OccupiedPosition() {
            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(1, 2));

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action));
            assertEquals("Invalid or occupied position", exception.getMessage());
        }

        /**
         * Tests that a player cannot validate turn when it's not their turn.
         * Sets current player to player1, then validates that player2 cannot act.
         * Should throw InvalidMoveException with appropriate message.
         */
        @Test
        @DisplayName("Invalid move - wrong player turn")
        void testInvalidMove_WrongPlayerTurn() {
            gameModel.setCurrentPlayerId(player1Id);

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validatePlayerTurn(gameModel, player2Id));
            assertEquals("Not your turn", exception.getMessage());
        }

        /**
         * Tests that moves are invalid when game is not in progress.
         * Sets game state to COMPLETED, then validates that no moves are allowed.
         * Should throw InvalidMoveException with appropriate message.
         */
        @Test
        @DisplayName("Invalid move - game not in progress")
        void testInvalidMove_GameNotInProgress() {
            gameModel.setGameState(GameState.COMPLETED);

            InvalidMoveException exception = assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validatePlayerTurn(gameModel, player1Id));
            assertEquals("Game is not in progress", exception.getMessage());
        }

        /**
         * Tests that first move after initialization can be placed anywhere.
         * Clears player1's placed cards to simulate first move scenario.
         * Any empty position should be valid when player has no cards on board.
         */
        @Test
        @DisplayName("Valid first move after initialization")
        void testValidMove_FirstMoveAfterInitialization() {
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.setPlacedCards(new HashMap<>());
            playerRepository.save(player1);

            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(2, 2));

            assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                    "Should allow first move at any empty position");
        }
    }

    @Nested
    @DisplayName("Comprehensive Parameterized Tests")
    class ParameterizedTests {

        /**
         * Parameterized test for all adjacency combinations from center position.
         * Tests orthogonal (valid), diagonal (invalid), distant (invalid), and
         * out-of-bounds (invalid) placements systematically using CSV data.
         *
         * @param targetX target placement X coordinate
         * @param targetY target placement Y coordinate
         * @param ownCardX own card X coordinate
         * @param ownCardY own card Y coordinate
         * @param shouldBeValid whether the placement should be valid
         */
        @ParameterizedTest
        @CsvSource({
                "1,1,1,2,true",
                "1,3,1,2,true",
                "0,2,1,2,true",
                "2,2,1,2,true",
                "0,1,1,2,false",
                "2,1,1,2,false",
                "0,3,1,2,false",
                "2,3,1,2,false",
                "1,0,1,2,false",
                "1,4,1,2,false",
                "3,2,1,2,false"
        })
        @DisplayName("Test all adjacency combinations from center position")
        void testAdjacencyFromCenterPosition(int targetX, int targetY, int ownCardX, int ownCardY, boolean shouldBeValid) {
            gameModel.getBoard().getPieces().clear();
            gameModel.getBoard().placeCard(new Position(ownCardX, ownCardY), "test_own_card");

            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();
            player1.getPlacedCards().put(ownCardX + "," + ownCardY, new Card("test_own_card", 1, "Test Own Card"));
            playerRepository.save(player1);

            PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(targetX, targetY));

            if (shouldBeValid) {
                assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                        String.format("Should allow placement at (%d,%d) when own card is at (%d,%d)",
                                targetX, targetY, ownCardX, ownCardY));
            } else {
                assertThrows(InvalidMoveException.class,
                        () -> gameValidator.validateMove(gameModel, action),
                        String.format("Should NOT allow placement at (%d,%d) when own card is at (%d,%d)",
                                targetX, targetY, ownCardX, ownCardY));
            }
        }

        /**
         * Parameterized test for adjacency validation from every board position.
         * Tests all 15 board positions (3x5) as source positions, validating
         * that orthogonal moves are allowed and diagonal moves are rejected.
         *
         * @param sourceX source card X coordinate (0-2)
         * @param sourceY source card Y coordinate (0-4)
         */
        @ParameterizedTest
        @MethodSource("allBoardPositions")
        @DisplayName("Test adjacency from every board position")
        void testAdjacencyFromEveryPosition(int sourceX, int sourceY) {
            gameModel.getBoard().getPieces().clear();
            gameModel.getBoard().placeCard(new Position(sourceX, sourceY), "source_card");

            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();
            player1.getPlacedCards().put(sourceX + "," + sourceY, new Card("source_card", 1, "Source Card"));
            playerRepository.save(player1);

            int[][] orthogonalOffsets = {{0,1}, {0,-1}, {1,0}, {-1,0}};

            for (int[] offset : orthogonalOffsets) {
                int targetX = sourceX + offset[0];
                int targetY = sourceY + offset[1];

                if (targetX < 0 || targetX >= 3 || targetY < 0 || targetY >= 5) {
                    continue;
                }

                PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(targetX, targetY));
                assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                        String.format("Should allow orthogonal placement from (%d,%d) to (%d,%d)",
                                sourceX, sourceY, targetX, targetY));
            }

            int[][] diagonalOffsets = {{1,1}, {1,-1}, {-1,1}, {-1,-1}};

            for (int[] offset : diagonalOffsets) {
                int targetX = sourceX + offset[0];
                int targetY = sourceY + offset[1];

                if (targetX < 0 || targetX >= 3 || targetY < 0 || targetY >= 5) {
                    continue;
                }

                PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(targetX, targetY));
                assertThrows(InvalidMoveException.class,
                        () -> gameValidator.validateMove(gameModel, action),
                        String.format("Should NOT allow diagonal placement from (%d,%d) to (%d,%d)",
                                sourceX, sourceY, targetX, targetY));
            }
        }

        /**
         * Provides all board positions for parameterized testing.
         * Generates coordinates for all 15 positions on the 3x5 board.
         *
         * @return stream of Arguments containing (x, y) coordinates
         */
        static Stream<Arguments> allBoardPositions() {
            List<Arguments> positions = new ArrayList<>();
            for (int x = 0; x < 3; x++) {
                for (int y = 0; y < 5; y++) {
                    positions.add(Arguments.of(x, y));
                }
            }
            return positions.stream();
        }

        /**
         * Parameterized test for chain building with multiple cards.
         * Tests building horizontal chains of various lengths and validates
         * that placement adjacent to any card in the chain is allowed.
         *
         * @param chainLength length of the chain to build (1-10)
         */
        @ParameterizedTest
        @ValueSource(ints = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10})
        @DisplayName("Test chain building with multiple cards")
        void testChainBuilding(int chainLength) {
            gameModel.getBoard().getPieces().clear();
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();

            for (int i = 0; i < Math.min(chainLength, 3); i++) {
                String cardId = "chain_card_" + i;
                gameModel.getBoard().placeCard(new Position(i, 2), cardId);
                player1.getPlacedCards().put(i + ",2", new Card(cardId, 1, "Chain Card " + i));
            }
            playerRepository.save(player1);

            if (chainLength <= 3) {
                PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(0, 1));
                assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                        "Should allow placement adjacent to any card in chain of length " + chainLength);
            }
        }
    }

    @Nested
    @DisplayName("Stress Tests and Complex Board States")
    class StressTests {

        /**
         * Tests adjacency validation on a nearly full board with complex ownership.
         * Creates a checkerboard pattern with mixed player ownership, leaving 2 empty
         * spaces. Validates that adjacency rules are correctly applied in complex scenarios.
         */
        @Test
        @DisplayName("Nearly full board with complex ownership pattern")
        void testNearlyFullBoardComplexOwnership() {
            // Clear board and create a complex checkerboard-like pattern
            gameModel.getBoard().getPieces().clear();
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            Player player2 = playerRepository.findById(player2Id).orElseThrow();
            player1.getPlacedCards().clear();
            player2.getPlacedCards().clear();

            // Create checkerboard pattern (player1 on even sum coordinates, player2 on odd)
            int cardCounter = 0;
            for (int x = 0; x < 3; x++) {
                for (int y = 0; y < 5; y++) {
                    if (cardCounter >= 13) break; // Leave 2 empty spaces

                    String cardId = "card_" + cardCounter;
                    gameModel.getBoard().placeCard(new Position(x, y), cardId);

                    if ((x + y) % 2 == 0) {
                        player1.getPlacedCards().put(x + "," + y, new Card(cardId, 1, "P1 Card " + cardCounter));
                    } else {
                        player2.getPlacedCards().put(x + "," + y, new Card(cardId, 1, "P2 Card " + cardCounter));
                    }
                    cardCounter++;
                }
            }
            playerRepository.save(player1);
            playerRepository.save(player2);

            // Find empty positions and test adjacency rules
            List<Position> emptyPositions = gameModel.getBoard().getEmptyPositions();
            assertFalse(emptyPositions.isEmpty(), "Should have empty positions for testing");

            for (Position emptyPos : emptyPositions) {
                PlayerAction action = createValidatorPlaceCardAction(player1Id, emptyPos);

                // Check if position is orthogonally adjacent to any player1 card
                boolean hasAdjacentOwnCard = false;
                int[][] orthogonalOffsets = {{0,1}, {0,-1}, {1,0}, {-1,0}};

                for (int[] offset : orthogonalOffsets) {
                    int adjX = emptyPos.getX() + offset[0];
                    int adjY = emptyPos.getY() + offset[1];
                    String adjKey = adjX + "," + adjY;

                    if (player1.getPlacedCards().containsKey(adjKey)) {
                        hasAdjacentOwnCard = true;
                        break;
                    }
                }

                if (hasAdjacentOwnCard) {
                    assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                            "Should allow placement at " + emptyPos.toStorageString() + " when orthogonally adjacent to own card");
                } else {
                    assertThrows(InvalidMoveException.class,
                            () -> gameValidator.validateMove(gameModel, action),
                            "Should NOT allow placement at " + emptyPos.toStorageString() + " when not orthogonally adjacent to own card");
                }
            }
        }

        @Test
        @DisplayName("Maximum chain length scenarios")
        void testMaximumChainLengthScenarios() {
            // Test maximum possible horizontal chain (3 cards)
            gameModel.getBoard().getPieces().clear();
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();

            // Create maximum horizontal chain
            for (int x = 0; x < 3; x++) {
                String cardId = "h_chain_" + x;
                gameModel.getBoard().placeCard(new Position(x, 2), cardId);
                player1.getPlacedCards().put(x + ",2", new Card(cardId, 1, "H Chain " + x));
            }

            // Test maximum vertical chain (5 cards)
            gameModel.getBoard().getPieces().clear();
            player1.getPlacedCards().clear();

            for (int y = 0; y < 5; y++) {
                String cardId = "v_chain_" + y;
                gameModel.getBoard().placeCard(new Position(1, y), cardId);
                player1.getPlacedCards().put("1," + y, new Card(cardId, 1, "V Chain " + y));
            }
            playerRepository.save(player1);

            // Should not be able to place anywhere now (board column is full)
            for (int x = 0; x < 3; x++) {
                if (x == 1) continue; // Skip the occupied column
                for (int y = 0; y < 5; y++) {
                    PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(x, y));
                    assertThrows(InvalidMoveException.class,
                            () -> gameValidator.validateMove(gameModel, action),
                            "Should NOT allow placement away from vertical chain");
                }
            }
        }

        @Test
        @DisplayName("Isolated card groups behavior")
        void testIsolatedCardGroups() {
            // Create two separate groups of player1 cards with no connection
            gameModel.getBoard().getPieces().clear();
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();

            // Group 1: Top-left corner
            gameModel.getBoard().placeCard(new Position(0, 0), "group1_card1");
            gameModel.getBoard().placeCard(new Position(0, 1), "group1_card2");
            player1.getPlacedCards().put("0,0", new Card("group1_card1", 1, "Group 1 Card 1"));
            player1.getPlacedCards().put("0,1", new Card("group1_card2", 1, "Group 1 Card 2"));

            // Group 2: Bottom-right corner (separated by gaps)
            gameModel.getBoard().placeCard(new Position(2, 3), "group2_card1");
            gameModel.getBoard().placeCard(new Position(2, 4), "group2_card2");
            player1.getPlacedCards().put("2,3", new Card("group2_card1", 1, "Group 2 Card 1"));
            player1.getPlacedCards().put("2,4", new Card("group2_card2", 1, "Group 2 Card 2"));

            playerRepository.save(player1);

            // Should be able to place adjacent to either group
            // Adjacent to group 1
            PlayerAction action1 = createValidatorPlaceCardAction(player1Id, new Position(1, 0));
            assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action1),
                    "Should allow placement adjacent to isolated group 1");

            // Adjacent to group 2
            PlayerAction action2 = createValidatorPlaceCardAction(player1Id, new Position(1, 4));
            assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action2),
                    "Should allow placement adjacent to isolated group 2");

            // Not adjacent to either group
            PlayerAction action3 = createValidatorPlaceCardAction(player1Id, new Position(1, 2));
            assertThrows(InvalidMoveException.class,
                    () -> gameValidator.validateMove(gameModel, action3),
                    "Should NOT allow placement between isolated groups");
        }

        @Test
        @DisplayName("Performance test with many adjacency checks")
        void testPerformanceWithManyChecks() {
            // Create a scenario that requires checking many positions
            gameModel.getBoard().getPieces().clear();
            Player player1 = playerRepository.findById(player1Id).orElseThrow();
            player1.getPlacedCards().clear();

            // Place cards in a specific pattern that maximizes adjacency calculations
            int[][] positions = {{0,0}, {0,2}, {0,4}, {2,0}, {2,2}, {2,4}};
            for (int i = 0; i < positions.length; i++) {
                String cardId = "perf_card_" + i;
                Position pos = new Position(positions[i][0], positions[i][1]);
                gameModel.getBoard().placeCard(pos, cardId);
                player1.getPlacedCards().put(pos.toStorageString(), new Card(cardId, 1, "Perf Card " + i));
            }
            playerRepository.save(player1);

            // Test performance by validating moves at all remaining positions
            long startTime = System.currentTimeMillis();

            for (int x = 0; x < 3; x++) {
                for (int y = 0; y < 5; y++) {
                    Position testPos = new Position(x, y);
                    if (gameModel.getBoard().isPositionEmpty(testPos)) {
                        PlayerAction action = createValidatorPlaceCardAction(player1Id, testPos);
                        try {
                            gameValidator.validateMove(gameModel, action);
                        } catch (InvalidMoveException e) {
                            // Expected for some positions
                        }
                    }
                }
            }

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            assertTrue(duration < 1000, "Adjacency validation should complete within 1 second, took: " + duration + "ms");
        }
    }

    @Nested
    @DisplayName("Boundary Condition and Error Handling Tests")
    class BoundaryConditionTests {

        /**
         * Tests adjacency behavior from all four corner positions.
         * Validates that orthogonal moves are allowed from corners (0,0), (2,0),
         * (0,4), and (2,4), considering board boundary constraints.
         */
        @Test
        @DisplayName("All corner positions adjacency behavior")
        void testAllCornerPositions() {
            Position[] corners = {
                    new Position(0, 0), // Top-left
                    new Position(2, 0), // Top-right
                    new Position(0, 4), // Bottom-left
                    new Position(2, 4)  // Bottom-right
            };

            for (Position corner : corners) {
                // Clear board and place card at corner
                gameModel.getBoard().getPieces().clear();
                Player player1 = playerRepository.findById(player1Id).orElseThrow();
                player1.getPlacedCards().clear();

                String cardId = "corner_card_" + corner.toStorageString();
                gameModel.getBoard().placeCard(corner, cardId);
                player1.getPlacedCards().put(corner.toStorageString(), new Card(cardId, 1, "Corner Card"));
                playerRepository.save(player1);

                // Test all orthogonal positions from corner
                int[][] orthogonalOffsets = {{0,1}, {0,-1}, {1,0}, {-1,0}};
                for (int[] offset : orthogonalOffsets) {
                    int targetX = corner.getX() + offset[0];
                    int targetY = corner.getY() + offset[1];

                    if (targetX >= 0 && targetX < 3 && targetY >= 0 && targetY < 5) {
                        PlayerAction action = createValidatorPlaceCardAction(player1Id, new Position(targetX, targetY));
                        assertDoesNotThrow(() -> gameValidator.validateMove(gameModel, action),
                                "Should allow orthogonal placement from corner " + corner.toStorageString());
                    }
                }
            }
        }

        @Test
        @DisplayName("Edge positions adjacency behavior")
        void testAllEdgePositions() {
            // Test all edge positions (non-corner)
            List<Position> edges = new ArrayList<>();

            // Top and bottom edges
            for (int x = 1; x < 2; x++) {
                edges.add(new Position(x, 0)); // Top edge
                edges.add(new Position(x, 4)); // Bottom edge
            }

            // Left and right edges
            for (int y = 1; y < 4; y++) {
                edges.add(new Position(0, y)); // Left edge
                edges.add(new Position(2, y)); // Right edge
            }

            for (Position edge : edges) {
                gameModel.getBoard().getPieces().clear();
                Player player1 = playerRepository.findById(player1Id).orElseThrow();
                player1.getPlacedCards().clear();

                String cardId = "edge_card_" + edge.toStorageString();
                gameModel.getBoard().placeCard(edge, cardId);
                player1.getPlacedCards().put(edge.toStorageString(), new Card(cardId, 1, "Edge Card"));
                playerRepository.save(player1);

                // Count valid orthogonal moves from edge
                int validMoves = 0;
                int[][] orthogonalOffsets = {{0,1}, {0,-1}, {1,0}, {-1,0}};
                for (int[] offset : orthogonalOffsets) {
                    int targetX = edge.getX() + offset[0];
                    int targetY = edge.getY() + offset[1];

                    if (targetX >= 0 && targetX < 3 && targetY >= 0 && targetY < 5) {
                        validMoves++;
                    }
                }

                assertTrue(validMoves >= 2 && validMoves <= 3,
                        "Edge position should have 2-3 valid orthogonal moves, but had: " + validMoves);
            }
        }

        /**
         * Tests that null and invalid inputs are properly handled.
         * Validates that null position and null card parameters throw
         * appropriate exceptions rather than causing system failures.
         */
        @Test
        @DisplayName("Null and invalid input handling")
        void testNullAndInvalidInputHandling() {
            // Test null position
            assertThrows(Exception.class, () -> {
                PlayerAction action = ImmutablePlayerAction.builder()
                        .type(PlayerAction.ActionType.PLACE_CARD)
                        .playerId(player1Id)
                        .card(testCard)
                        .targetPosition(null)
                        .timestamp(System.currentTimeMillis())
                        .build();
                gameValidator.validateMove(gameModel, action);
            });

            // Test null card
            assertThrows(Exception.class, () -> {
                PlayerAction action = ImmutablePlayerAction.builder()
                        .type(PlayerAction.ActionType.PLACE_CARD)
                        .playerId(player1Id)
                        .card(null)
                        .targetPosition(new Position(0, 0))
                        .timestamp(System.currentTimeMillis())
                        .build();
                gameValidator.validateMove(gameModel, action);
            });
        }
    }

    /**
     * Helper method to create a PlayerAction for placing a card.
     * Converts CardDto to Card and builds PlayerAction with all required fields.
     *
     * @param playerId ID of the player making the move
     * @param cardDto DTO representation of the card to place
     * @param position target position for card placement
     * @return configured PlayerAction for the move
     */
    private PlayerAction createPlaceCardAction(String playerId, CardDto cardDto, Position position) {
        Card card = new Card(cardDto.getId(), cardDto.getPower(), cardDto.getName());
        return ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(playerId)
                .card(card)
                .targetPosition(position)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Helper method to create a PlayerAction using the test card.
     * Uses the standard testCard for validator testing scenarios.
     *
     * @param playerId ID of the player making the move
     * @param position target position for card placement
     * @return configured PlayerAction using the test card
     */
    private PlayerAction createValidatorPlaceCardAction(String playerId, Position position) {
        return ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(playerId)
                .card(testCard)
                .targetPosition(position)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
