package com.cardgame.config;

import com.cardgame.model.Card;
import com.cardgame.repository.CardRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(CardRepository cardRepository) {
        return args -> {
            try {
                // Check if cards already exist
                long cardCount = cardRepository.count();
            if (cardCount > 0) {
                System.out.println("Cards already initialized. Found " + cardCount + " cards.");
                return;
            }
            
            System.out.println("Initializing cards...");
            
            // Create Spark card
            Card sparkCard = new Card();
            sparkCard.setId("1");
            sparkCard.setName("Spark");
            sparkCard.setPower(1);
            sparkCard.setImageUrl("/gifs/spark.png");
            cardRepository.save(sparkCard);
            System.out.println("Created Spark card with ID: 1");
            
            // Create Lightning card
            Card lightningCard = new Card();
            lightningCard.setId("3");
            lightningCard.setName("Lightning");
            lightningCard.setPower(3);
            lightningCard.setImageUrl("/gifs/lightning.png");
            cardRepository.save(lightningCard);
            System.out.println("Created Lightning card with ID: 3");
            
            // Create Thunder card
            Card thunderCard = new Card();
            thunderCard.setId("5");
            thunderCard.setName("Thunder");
            thunderCard.setPower(5);
            thunderCard.setImageUrl("/gifs/thunder.png");
            cardRepository.save(thunderCard);
            System.out.println("Created Thunder card with ID: 5");
            
                System.out.println("Card initialization complete. Total cards: " + cardRepository.count());
            } catch (Exception e) {
                System.err.println("Failed to initialize cards: " + e.getMessage());
                // Continue application startup even if card initialization fails
            }
        };
    }
}