package com.cardgame.repository;

import java.util.List;
import java.util.Optional;
import com.cardgame.model.GameResult;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GameResultRepository extends MongoRepository<GameResult, String> {
    Optional<GameResult> findByGameId(String gameId);
    List<GameResult> findByWinnerId(String playerId);
    List<GameResult> findByPlayer1IdOrPlayer2Id(String playerId, String playerId2);
    List<GameResult> findByTimestampGreaterThan(long timestamp);
    List<GameResult> findByTimestampBetween(long startTime, long endTime);
}
