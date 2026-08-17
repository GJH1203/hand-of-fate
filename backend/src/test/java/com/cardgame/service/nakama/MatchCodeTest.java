package com.cardgame.service.nakama;

import com.cardgame.model.Board;
import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import com.cardgame.repository.GameRepository;
import com.cardgame.support.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletionException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * A match code is six hex characters, which is 16.7 million of them, and they are never
 * reused. That is fewer than it sounds: by the birthday bound, two games share a code
 * after about 4,800 have ever been created. A load test making 850 games a run found one.
 */
@DisplayName("Match codes")
@TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_matchcode")
class MatchCodeTest extends IntegrationTestBase {

    @Autowired
    private NakamaMatchService nakamaMatchService;

    /** A spy so that "this code is taken" can be arranged without creating 4,800 games. */
    @MockitoSpyBean
    private GameRepository gameRepository;

    @BeforeEach
    void setUp() {
        gameRepository.deleteAll();
    }

    @Test
    @DisplayName("a duplicate breaks both games, which is why they have to be unique")
    void duplicateCodeBreaksBothGames() {
        // Written directly, the way the old generator could have written them.
        saveGameWithCode("nakama_ABC123");
        saveGameWithCode("nakama_ABC123");

        // Neither game can be opened again. Not one of them — both.
        assertThrows(IncorrectResultSizeDataAccessException.class,
                () -> gameRepository.findByNakamaMatchId("nakama_ABC123"));
    }

    @Test
    @DisplayName("a code that a saved game already holds is drawn again")
    void takenCodeIsDrawnAgain() {
        // Waiting for a natural collision would mean creating thousands of games, so the
        // check is made to report "taken" for the first two codes instead. What is being
        // proved is that the answer is consulted at all and that a taken code is not
        // handed out, not the odds of drawing one.
        AtomicInteger checks = new AtomicInteger();
        doAnswer(invocation -> checks.incrementAndGet() <= 2)
                .when(gameRepository).existsByNakamaMatchId(anyString());

        String code = nakamaMatchService.createMatch("player-retrying").join();

        assertNotNull(code);
        assertEquals(3, checks.get(), "two codes should have been rejected and the third taken");
    }

    @Test
    @DisplayName("an exhausted space fails loudly rather than spinning")
    void exhaustedSpaceGivesUp() {
        doReturn(true).when(gameRepository).existsByNakamaMatchId(anyString());

        CompletionException thrown = assertThrows(CompletionException.class,
                () -> nakamaMatchService.createMatch("player-with-no-codes-left").join());

        Throwable root = thrown;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        assertInstanceOf(IllegalStateException.class, root);
        assertTrue(root.getMessage().contains("unused match code"), root.getMessage());
    }

    @Test
    @DisplayName("codes handed out at the same time are all different")
    void concurrentCodesAreDistinct() {
        List<String> codes = IntStream.range(0, 60)
                .parallel()
                .mapToObj(i -> nakamaMatchService.createMatch("concurrent-player-" + i).join())
                .toList();

        assertEquals(codes.size(), Set.copyOf(codes).size(), "every code should be distinct");
    }

    private void saveGameWithCode(String nakamaMatchId) {
        GameModel game = new GameModel();
        game.setId(UUID.randomUUID().toString());
        game.setGameState(GameState.IN_PROGRESS);
        game.setBoard(new Board());
        game.setPlayerIds(List.of("a", "b"));
        game.setNakamaMatchId(nakamaMatchId);
        gameRepository.save(game);
    }
}
