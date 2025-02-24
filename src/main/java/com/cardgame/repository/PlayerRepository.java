package com.cardgame.repository;


import java.util.List;
import java.util.Optional;
import com.cardgame.model.Player;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerRepository extends MongoRepository<Player, String> {
    Player findByName(String name);

    @Query("{'name': ?0}")
    Optional<Player> findPlayerByName(String name);

    @Query(value = "{'currentDeck': ?0}")
    List<Player> findPlayersByDeckId(String deckId);
}
