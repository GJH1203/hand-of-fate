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
            // Check if default card exists
            if (!cardRepository.existsById("1")) {
                // Create default card
                Card defaultCard = new Card();
                defaultCard.setId("1");
                defaultCard.setName("Default Card");
                defaultCard.setPower(1);
                cardRepository.save(defaultCard);
                System.out.println("Created default card with ID: 1");
            } else {
                System.out.println("Default card already exists");
            }
        };
    }
}