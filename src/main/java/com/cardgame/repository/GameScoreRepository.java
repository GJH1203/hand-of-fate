package com.cardgame.repository;

import java.util.List;
import java.util.Optional;
import com.cardgame.model.GameScore;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GameScoreRepository extends MongoRepository<GameScore, String> {
    Optional<GameScore> findByGameId(String gameId);
    List<GameScore> findByIsActiveTrue();
    List<GameScore> findByGameIdAndIsActiveTrue(String gameId);
    List<GameScore> findByLastUpdatedGreaterThan(long timestamp);
}
