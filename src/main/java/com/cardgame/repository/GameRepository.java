package com.cardgame.repository;

import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GameRepository extends MongoRepository {
    List<GameModel> findByState(GameState state);
    List<GameModel> findByStateOrderByCreatedAtDesc(GameState state);
}
