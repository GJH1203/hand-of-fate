package com.cardgame.repository;

import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface GameRepository extends MongoRepository<GameModel, String> {
//    List<GameModel> findByState(GameState state);
//    List<GameModel> findByStateOrderByCreatedAtDesc(GameState state);
}
