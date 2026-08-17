package com.cardgame.repository;

import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

public interface GameRepository extends MongoRepository<GameModel, String> {
    /**
     * Find active games (not completed) for a specific player
     * @param playerId The player ID to search for
     * @param states List of game states considered "active"
     * @return List of active games containing this player
     */
    List<GameModel> findByPlayerIdsContainingAndGameStateIn(String playerId, List<GameState> states);
    
    /**
     * Find the most recent active game for a player
     * @param playerId The player ID to search for
     * @param states List of game states considered "active"
     * @return The most recent active game or empty
     */
    Optional<GameModel> findFirstByPlayerIdsContainingAndGameStateInOrderByUpdatedAtDesc(
        String playerId, List<GameState> states);

    /**
     * Find the game backing a Nakama match.
     *
     * <p>The stored value is {@code "nakama_" + matchId}; see NakamaMatchService. This
     * replaced a scan of the whole collection that matched on {@code contains(matchId)},
     * which was both slower and looser — one match id being a substring of another would
     * have returned the wrong game.
     */
    Optional<GameModel> findByNakamaMatchId(String nakamaMatchId);

    /**
     * Delete every game this player took part in, whatever state it is in.
     *
     * <p>A game names its participants and nothing else names the game, so a game whose
     * player has been deleted is unreachable: it can never be listed, resumed or scored,
     * and it holds an id that no longer resolves.
     *
     * @param playerId The player ID to search for
     * @return how many games were deleted
     */
    long deleteByPlayerIdsContaining(String playerId);
}
