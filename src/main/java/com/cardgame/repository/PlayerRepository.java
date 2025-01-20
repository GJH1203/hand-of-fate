package com.cardgame.repository;


import com.cardgame.dto.PlayerDto;
import com.cardgame.model.Player;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlayerRepository extends MongoRepository<Player, String> {
    Player findByName(String name);
}
