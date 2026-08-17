package com.cardgame.service.player;

import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.DeckInitializationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;

/**
 * Deleting a player used to delete only the player document, which left their games
 * behind naming an id that no longer resolved. Nothing else ever collected them.
 *
 * <p>A unit test rather than a {@code @SpringBootTest}: what is being checked is which
 * collections the service touches, and that does not need a database to answer.
 */
@ExtendWith(MockitoExtension.class)
class PlayerDeletionTest {

    private static final String PLAYER_ID = "player-1";

    @Mock
    private PlayerActionService playerActionService;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private DeckRepository deckRepository;
    @Mock
    private DeckInitializationService deckInitializationService;

    @InjectMocks
    private PlayerService playerService;

    @Test
    void deletingAPlayerAlsoDeletesTheirGamesAndDecks() {
        playerService.deletePlayer(PLAYER_ID);

        verify(gameRepository).deleteByPlayerIdsContaining(PLAYER_ID);
        verify(deckRepository).deleteByOwnerId(PLAYER_ID);
        verify(playerRepository).deleteById(PLAYER_ID);
    }

    @Test
    void theOwnedDataGoesBeforeThePlayerDoes() {
        playerService.deletePlayer(PLAYER_ID);

        // A failure part way through has to leave a state the caller can recover from by
        // deleting again, which means the player must be the last thing to go.
        var order = inOrder(gameRepository, deckRepository, playerRepository);
        order.verify(gameRepository).deleteByPlayerIdsContaining(PLAYER_ID);
        order.verify(deckRepository).deleteByOwnerId(PLAYER_ID);
        order.verify(playerRepository).deleteById(PLAYER_ID);
    }
}
