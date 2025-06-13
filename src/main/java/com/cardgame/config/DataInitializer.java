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
            // Check and update default card
            Card sparkCard = cardRepository.findById("1").orElse(null);
            if (sparkCard == null) {
                // Create new card
                sparkCard = new Card();
                sparkCard.setId("1");
                sparkCard.setName("Spark");
                sparkCard.setPower(1);
                cardRepository.save(sparkCard);
                System.out.println("Created Spark card with ID: 1");
            } else if (!sparkCard.getName().equals("Spark")) {
                // Update existing card name
                sparkCard.setName("Spark");
                cardRepository.save(sparkCard);
                System.out.println("Updated card ID 1 to Spark");
            } else {
                System.out.println("Spark card already exists");
            }
            
            // Check if power 3 card exists
            if (!cardRepository.existsById("3")) {
                Card powerCard3 = new Card();
                powerCard3.setId("3");
                powerCard3.setName("Lightning");
                powerCard3.setPower(3);
                cardRepository.save(powerCard3);
                System.out.println("Created card with ID: 3");
            } else {
                System.out.println("Power 3 card already exists");
            }
            
            // Check if power 5 card exists
            if (!cardRepository.existsById("5")) {
                Card powerCard5 = new Card();
                powerCard5.setId("5");
                powerCard5.setName("Thunder");
                powerCard5.setPower(5);
                cardRepository.save(powerCard5);
                System.out.println("Created card with ID: 5");
            } else {
                System.out.println("Power 5 card already exists");
            }
        };
    }
}