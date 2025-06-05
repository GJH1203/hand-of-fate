package com.cardgame.repository;


import java.util.List;
import java.util.Optional;
import com.cardgame.model.Player;
import javax.swing.text.html.Option;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerRepository extends MongoRepository<Player, String> {
    Optional<Player> findByName(String name);

    @Query("{'name': ?0}")
    Optional<Player> findPlayerByName(String name);

    @Query(value = "{'currentDeck': ?0}")
    List<Player> findPlayersByDeckId(String deckId);

    // Add this method to find player by Nakama user ID
    Optional<Player> findByNakamaUserId(String nakamaUserId);

    // Add this method to find player by email
    Optional<Player> findByEmail(String email);
    
    // Add this method to find player by Supabase user ID
    Optional<Player> findBySupabaseUserId(String supabaseUserId);
    
    // Add this method to find ALL players with the same Supabase user ID (for cleanup)
    List<Player> findAllBySupabaseUserId(String supabaseUserId);
    
    // Add this method to find ALL players with the same email (for cleanup)
    List<Player> findAllByEmail(String email);
}
