package com.cardgame.service;

import com.cardgame.dto.CardDto;
import com.cardgame.dto.GameDto;
import com.cardgame.dto.ImmutablePlayerAction;
import com.cardgame.dto.PlayerAction;
import com.cardgame.exception.game.ConcurrentMoveException;
import com.cardgame.model.Card;
import com.cardgame.model.ConnectionStatus;
import com.cardgame.model.Deck;
import com.cardgame.model.GameModel;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * A move reads the game, changes it and writes it back. Two moves that interleave those
 * three steps would leave whichever wrote second having silently discarded the first.
 */
@DisplayName("Optimistic locking on the move path")
@TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_concurrentmove")
class ConcurrentMoveTest extends IntegrationTestBase {

    private static final int DECK_SIZE = 5;

    @Autowired
    private GameService gameService;

    /**
     * A spy rather than a mock: every test here needs the real repository, and two of
     * them need one save to fail at a moment no amount of setup from outside can reach.
     */
    @MockitoSpyBean
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

        List<Card> cards1 = createCards("p1");
        List<Card> cards2 = createCards("p2");

        player1 = newPlayer("ConcurrentPlayer1");
        player2 = newPlayer("ConcurrentPlayer2");

        deck1 = newDeck(player1.getId(), cards1);
        deck2 = newDeck(player2.getId(), cards2);
    }

    private Player newPlayer(String name) {
        Player player = new Player();
        player.setId(UUID.randomUUID().toString());
        player.setName(name);
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

    @Test
    @DisplayName("a game is created with a version")
    void newGameIsVersioned() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        GameModel stored = gameRepository.findById(game.getId()).orElseThrow();
        assertNotNull(stored.getVersion(), "a saved game should carry a version");
    }

    @Test
    @DisplayName("a move increments the version")
    void moveIncrementsVersion() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());
        long before = gameRepository.findById(game.getId()).orElseThrow().getVersion();

        gameService.applyMove(game.getId(), placeFirstCardAt(game, new Position(1, 4)));

        long after = gameRepository.findById(game.getId()).orElseThrow().getVersion();
        assertEquals(before + 1, after);
    }

    @Test
    @DisplayName("a stale copy of a game cannot be saved over a newer one")
    void staleWriteIsRefused() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Two readers, as two concurrent moves would be.
        GameModel first = gameRepository.findById(game.getId()).orElseThrow();
        GameModel second = gameRepository.findById(game.getId()).orElseThrow();

        first.setUpdatedAt(java.time.Instant.now());
        gameRepository.save(first);

        // The second still believes in the version it read, which is no longer the one on
        // the document. Without @Version this save would land and the first would vanish.
        second.setUpdatedAt(java.time.Instant.now());
        assertThrows(OptimisticLockingFailureException.class, () -> gameRepository.save(second));
    }

    @Test
    @DisplayName("a move that loses the race once is retried, not lost")
    void moveIsRetriedAfterOneConflict() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());
        PlayerAction action = placeFirstCardAt(game, new Position(1, 4));

        // Lose the first save the way a concurrent writer would, then let the second
        // through. Stubbing the save is the only way to land inside the window between
        // the read and the write, which is the whole of what @Version protects; the reset
        // is how the stub steps aside afterwards, since a repository is an interface and
        // there is no real method for Mockito to fall through to.
        AtomicInteger interceptedSaves = new AtomicInteger();
        doAnswer(invocation -> {
            interceptedSaves.incrementAndGet();
            reset(gameRepository);
            throw new OptimisticLockingFailureException("beaten to the save");
        }).when(gameRepository).save(any(GameModel.class));

        GameModel result = gameService.applyMove(game.getId(), action);

        assertEquals(1, interceptedSaves.get(), "exactly one save should have been made to fail");
        assertTrue(result.getBoard().getPieces().containsKey("1,4"), "the move should have been applied");
        assertEquals(player2.getId(), result.getCurrentPlayerId(), "and the turn should have passed");
    }

    @Test
    @DisplayName("a move that keeps losing the race is refused, not silently dropped")
    void repeatedConflictIsReported() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());
        PlayerAction action = placeFirstCardAt(game, new Position(1, 4));

        AtomicInteger attemptedSaves = new AtomicInteger();
        doAnswer(invocation -> {
            attemptedSaves.incrementAndGet();
            throw new OptimisticLockingFailureException("beaten to the save");
        }).when(gameRepository).save(any(GameModel.class));

        ConcurrentMoveException thrown = assertThrows(ConcurrentMoveException.class,
                () -> gameService.applyMove(game.getId(), action));
        assertTrue(thrown.getMessage().toLowerCase().contains("reload"),
                "the client should be told to resync, but got: " + thrown.getMessage());

        // Two attempts and no more: retrying for ever would hold a request open.
        assertEquals(2, attemptedSaves.get());

        // And the move really was not applied.
        reset(gameRepository);
        GameModel stored = gameRepository.findById(game.getId()).orElseThrow();
        assertFalse(stored.getBoard().getPieces().containsKey("1,4"));
    }

    @Test
    @DisplayName("two players dropping at once both get recorded")
    void bothDisconnectionsLand() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());

        // Both players leaving a finished match at the same moment is the ordinary way a
        // match ends, and it used to be a read, a change and a save each — so one of the
        // two lost the version check and its disconnection was never recorded. Neither of
        // these reads the game, so neither can lose.
        assertDoesNotThrow(() -> {
            gameService.recordConnectionStatus(game.getId(), player1.getId(), ConnectionStatus.DISCONNECTED);
            gameService.recordConnectionStatus(game.getId(), player2.getId(), ConnectionStatus.DISCONNECTED);
        });

        GameModel stored = gameRepository.findById(game.getId()).orElseThrow();
        assertEquals(ConnectionStatus.DISCONNECTED, stored.getPlayerConnections().get(player1.getId()));
        assertEquals(ConnectionStatus.DISCONNECTED, stored.getPlayerConnections().get(player2.getId()));
    }

    @Test
    @DisplayName("a move interrupted by a disconnection is retried rather than refused")
    void moveSurvivesAConcurrentDisconnection() {
        GameDto game = gameService.initializeGame(player1.getId(), player2.getId(), deck1.getId(), deck2.getId());
        PlayerAction action = placeFirstCardAt(game, new Position(1, 4));

        // MongoTemplate still advances the version on a targeted update, so a move already
        // in flight when somebody drops does lose its check. That is the retry's job and
        // it is worth naming: the fix is that the disconnection stops failing, not that it
        // stops being noticed.
        doAnswer(invocation -> {
            reset(gameRepository);
            gameService.recordConnectionStatus(game.getId(), player2.getId(), ConnectionStatus.DISCONNECTED);
            throw new OptimisticLockingFailureException("a socket dropped mid-move");
        }).when(gameRepository).save(any(GameModel.class));

        GameModel result = gameService.applyMove(game.getId(), action);

        assertTrue(result.getBoard().getPieces().containsKey("1,4"), "the move should still have landed");
        assertEquals(ConnectionStatus.DISCONNECTED, result.getPlayerConnections().get(player2.getId()));
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
}
