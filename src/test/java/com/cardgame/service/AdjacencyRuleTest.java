package com.cardgame.service;

import com.cardgame.dto.*;
import com.cardgame.model.*;
import com.cardgame.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AdjacencyRuleTest {

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

    private String player1Id;
    private String player2Id;
    private String deck1Id;
    private String deck2Id;
    private GameDto game;

    @BeforeEach
    void setUp() {
        // Clean up
        gameRepository.deleteAll();
        playerRepository.deleteAll();
        deckRepository.deleteAll();
        cardRepository.deleteAll();

        // Create test data
        setupTestPlayers();
        game = gameService.initializeGame(player1Id, player2Id, deck1Id, deck2Id);
    }

    private void setupTestPlayers() {
        // Create cards
        List<Card> cards = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            Card card = new Card("card_" + i, i, "Card " + i);
            cards.add(card);
            cardRepository.save(card);
        }

        // Create players and decks
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

    @Test
    void testValidMove_AdjacentToOwnCard() {
        // Initial cards are at (1,3) for player1 and (1,1) for player2
        // Player 1 places adjacent to their card
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(0, 3));

        GameDto updatedGame = gameService.processMove(game.getId(), action);

        assertEquals(3, updatedGame.getBoard().getPieces().size());
        assertEquals(player2Id, updatedGame.getCurrentPlayerId());
    }

    @Test
    void testInvalidMove_AdjacentOnlyToOpponentCard() {
        // Player 1 tries to place adjacent only to player 2's card at (1,1)
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(0, 1));

        try {
            GameDto result = gameService.processMove(game.getId(), action);
            System.out.println("Move was allowed when it shouldn't be!");
            System.out.println("Board pieces: " + result.getBoard().getPieces());
            fail("Expected exception but move was allowed");
        } catch (Exception e) {
            // Expected
            System.out.println("Correctly rejected: " + e.getMessage());
        }
    }

    @Test
    void testInvalidMove_NotAdjacentToAnyCard() {
        // Player 1 tries to place in a corner, not adjacent to any card
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(0, 0));

        assertThrows(Exception.class, () -> gameService.processMove(game.getId(), action));
    }

    @Test
    void testValidMove_DiagonalAdjacency() {
        // Player 1 places diagonally adjacent to their card at (1,3)
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(0, 2));

        assertDoesNotThrow(() -> gameService.processMove(game.getId(), action));
    }

    @Test
    void testInvalidMove_OccupiedPosition() {
        // Try to place on initial position (1,3)
        CardDto cardToPlace = game.getCurrentPlayerHand().get(0);
        PlayerAction action = createPlaceCardAction(player1Id, cardToPlace, new Position(1, 3));

        assertThrows(Exception.class, () -> gameService.processMove(game.getId(), action));
    }

    @Test
    void testInvalidMove_WrongPlayerTurn() {
        // Player 2 tries to move on player 1's turn
        Player player2 = playerRepository.findById(player2Id).orElseThrow();
        Card card = player2.getHand().get(0);
        PlayerAction action = createPlaceCardAction(player2Id, 
            ImmutableCardDto.builder()
                .id(card.getId())
                .power(card.getPower())
                .name(card.getName())
                .build(), 
            new Position(0, 1));

        assertThrows(Exception.class, () -> gameService.processMove(game.getId(), action));
    }

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
}