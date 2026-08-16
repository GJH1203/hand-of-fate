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
}
