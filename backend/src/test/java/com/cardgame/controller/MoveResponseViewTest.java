package com.cardgame.controller;

import com.cardgame.dto.CardDto;
import com.cardgame.dto.GameDto;
import com.cardgame.dto.ImmutablePlayerAction;
import com.cardgame.dto.PlayerAction;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.GameMode;
import com.cardgame.model.GameModel;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.GameService;
import com.cardgame.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import com.cardgame.support.TestJwtSupport;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Who a move's answer is built for.
 *
 * <p>`convertToDto` fills `currentPlayerHand` for whoever it is asked about, and a move
 * ends with the turn having passed — so answering a move with the view of whoever's turn
 * it now is hands the mover their opponent's cards.
 */
@DisplayName("The view a move is answered with")
@AutoConfigureMockMvc
@Import(TestJwtSupport.class)
@TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_moveview")
class MoveResponseViewTest extends IntegrationTestBase {

    private static final int DECK_SIZE = 5;

    private static final String P1_SUPABASE_ID = "moveview-p1-supabase";

    @Autowired
    private GameService gameService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private CardRepository cardRepository;

    private Player player1;
    private Player player2;
    private Deck deck1;
    private Deck deck2;

    @BeforeEach
    void setUp() {
        gameRepository.deleteAll();
        playerRepository.deleteAll();
        deckRepository.deleteAll();
        cardRepository.deleteAll();

        player1 = newPlayer("MoveViewPlayer1", P1_SUPABASE_ID);
        player2 = newPlayer("MoveViewPlayer2");
        deck1 = newDeck(player1.getId(), createCards("p1"));
        deck2 = newDeck(player2.getId(), createCards("p2"));
    }

    @Test
    @DisplayName("is the mover's own, not whoever's turn it now is")
    void answersTheMoverWithTheirOwnHand() {
        GameDto created = gameService.initializeGame(
                player1.getId(), player2.getId(), deck1.getId(), deck2.getId());
        markOnline(created.getId());

        PlayerAction action = placeFirstCardAt(created, new Position(1, 4));
        GameModel updated = gameService.applyMove(created.getId(), action);

        // The turn has passed, so "the current player" is the opponent now.
        assertEquals(player2.getId(), updated.getCurrentPlayerId());

        GameDto answer = gameService.convertToDto(updated, player1.getId());

        // Player 1 asked; player 1's cards come back.
        assertEquals(cardIds(updated.handOf(player1.getId())),
                dtoCardIds(answer.getCurrentPlayerHand()));

        // And none of player 2's, which is what answering with the current player's view
        // would have sent — the mover would have been handed their opponent's hand.
        List<String> opponentCards = cardIds(updated.handOf(player2.getId()));
        for (String id : dtoCardIds(answer.getCurrentPlayerHand())) {
            assertFalse(opponentCards.contains(id), "opponent card " + id + " leaked into the answer");
        }
    }

    @Test
    @DisplayName("does not depend on whose turn it is")
    void theOpponentsViewIsTheirOwnToo() {
        GameDto created = gameService.initializeGame(
                player1.getId(), player2.getId(), deck1.getId(), deck2.getId());
        markOnline(created.getId());

        GameModel updated = gameService.applyMove(
                created.getId(), placeFirstCardAt(created, new Position(1, 4)));

        GameDto forPlayer2 = gameService.convertToDto(updated, player2.getId());
        assertEquals(cardIds(updated.handOf(player2.getId())),
                dtoCardIds(forPlayer2.getCurrentPlayerHand()));
    }

    @Test
    @DisplayName("the moves endpoint does not answer with the opponent's hand")
    void theEndpointDoesNotLeakTheOpponentsHand() throws Exception {
        GameDto created = gameService.initializeGame(
                player1.getId(), player2.getId(), deck1.getId(), deck2.getId());
        markOnline(created.getId());

        CardDto toPlace = created.getCurrentPlayerHand().get(0);
        String body = objectMapper.writeValueAsString(java.util.Map.of(
                "playerId", player1.getId(),
                "card", java.util.Map.of("id", toPlace.getId(), "power", toPlace.getPower(),
                        "name", toPlace.getName()),
                "position", java.util.Map.of("x", 1, "y", 4)));

        String response = mockMvc.perform(post("/game/" + created.getId() + "/moves")
                        .header(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor(P1_SUPABASE_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        GameModel after = gameRepository.findById(created.getId()).orElseThrow();
        List<String> opponentCards = cardIds(after.handOf(player2.getId()));

        JsonNode hand = objectMapper.readTree(response).get("currentPlayerHand");
        List<String> answered = new ArrayList<>();
        hand.forEach(c -> answered.add(c.get("id").asText()));

        assertFalse(answered.isEmpty(), "the mover should get a hand back");
        for (String id : answered) {
            assertFalse(opponentCards.contains(id),
                    "the answer to player 1's move contained player 2's card " + id);
        }
        assertEquals(cardIds(after.handOf(player1.getId())), answered,
                "the answer should be the mover's own hand");
    }

    private void markOnline(String gameId) {
        GameModel game = gameRepository.findById(gameId).orElseThrow();
        game.setGameMode(GameMode.ONLINE);
        game.setNakamaMatchId("nakama_VIEW01");
        gameRepository.save(game);
    }

    private PlayerAction placeFirstCardAt(GameDto game, Position position) {
        CardDto cardDto = game.getCurrentPlayerHand().get(0);
        return ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(game.getCurrentPlayerId())
                .card(new Card(cardDto.getId(), cardDto.getPower(), cardDto.getName()))
                .targetPosition(position)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    private List<String> cardIds(List<Card> cards) {
        return cards.stream().map(Card::getId).toList();
    }

    private List<String> dtoCardIds(List<CardDto> cards) {
        return cards.stream().map(CardDto::getId).toList();
    }

    private Player newPlayer(String name) {
        return newPlayer(name, null);
    }

    private Player newPlayer(String name, String supabaseUserId) {
        Player player = new Player();
        player.setId(UUID.randomUUID().toString());
        player.setName(name);
        player.setSupabaseUserId(supabaseUserId);
        return playerRepository.save(player);
    }

    private Deck newDeck(String ownerId, List<Card> cards) {
        Deck deck = new Deck();
        deck.setId(UUID.randomUUID().toString());
        deck.setOwnerId(ownerId);
        deck.setCards(cards);
        deck.setRemainingCards(DECK_SIZE);
        return deckRepository.save(deck);
    }

    private List<Card> createCards(String prefix) {
        List<Card> cards = new ArrayList<>();
        for (int i = 1; i <= DECK_SIZE; i++) {
            Card card = new Card(prefix + "_card_" + i, i, "Card " + i);
            cards.add(card);
            cardRepository.save(card);
        }
        return cards;
    }
}
