package com.cardgame.repository;

import com.cardgame.model.Deck;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeckRepository extends MongoRepository<Deck, String> {
    List<Deck> findByOwnerId(String ownerId);
    Optional<Deck> findByIdAndOwnerId(String id, String ownerId);
}
