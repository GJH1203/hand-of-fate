package com.cardgame.service;

import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.repository.CardRepository;
import com.cardgame.service.player.DeckService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service responsible for initializing player decks
 * Extracted from PlayerService to improve separation of concerns
 */
@Service
public class DeckInitializationService {
    private static final Logger logger = LoggerFactory.getLogger(DeckInitializationService.class);
    private static final int DEFAULT_DECK_SIZE = 5;
    private static final String DEFAULT_CARD_ID = "1";
    private static final String POWER_3_CARD_ID = "3";
    private static final String POWER_5_CARD_ID = "5";
    
    private final CardRepository cardRepository;
    private final DeckService deckService;
    
    @Autowired
    public DeckInitializationService(CardRepository cardRepository, DeckService deckService) {
        this.cardRepository = cardRepository;
        this.deckService = deckService;
    }
    
    /**
     * Creates a default deck for a new player
     * @param playerId The player's ID
     * @return The created deck
     */
    public Deck createDefaultDeckForPlayer(String playerId) {
        List<Card> defaultCards = createDefaultCards();
        return deckService.createDeck(playerId, defaultCards);
    }
    
    /**
     * Creates the default set of cards for a new player's deck
     * Distribution: 1 power-1 card, 2 power-3 cards, 1 power-5 card, 1 additional power-1 card (total 5)
     * @return List of default cards
     */
    private List<Card> createDefaultCards() {
        List<Card> defaultCards = new ArrayList<>();
        
        // Get the template cards from the database
        Card sparkCard = cardRepository.findById(DEFAULT_CARD_ID)
                .orElseThrow(() -> new RuntimeException("Spark card (power 1) with ID " + DEFAULT_CARD_ID + " not found. Please ensure database is initialized."));
        Card lightningCard = cardRepository.findById(POWER_3_CARD_ID)
                .orElseThrow(() -> new RuntimeException("Lightning card (power 3) with ID " + POWER_3_CARD_ID + " not found. Please ensure database is initialized."));
        Card thunderCard = cardRepository.findById(POWER_5_CARD_ID)
                .orElseThrow(() -> new RuntimeException("Thunder card (power 5) with ID " + POWER_5_CARD_ID + " not found. Please ensure database is initialized."));
        
        // Create 2 Spark cards (power 1)
        for (int i = 0; i < 2; i++) {
            Card uniqueCard = new Card();
            uniqueCard.setId("spark_" + UUID.randomUUID().toString());
            uniqueCard.setPower(sparkCard.getPower());
            uniqueCard.setName(sparkCard.getName());
            defaultCards.add(uniqueCard);
        }
        
        // Create 2 Lightning cards (power 3)
        for (int i = 0; i < 2; i++) {
            Card uniqueCard = new Card();
            uniqueCard.setId("lightning_" + UUID.randomUUID().toString());
            uniqueCard.setPower(lightningCard.getPower());
            uniqueCard.setName(lightningCard.getName());
            defaultCards.add(uniqueCard);
        }
        
        // Create 1 Thunder card (power 5)
        Card uniqueCard = new Card();
        uniqueCard.setId("thunder_" + UUID.randomUUID().toString());
        uniqueCard.setPower(thunderCard.getPower());
        uniqueCard.setName(thunderCard.getName());
        defaultCards.add(uniqueCard);
        
        logger.debug("Created {} default cards for new deck (2 Spark, 2 Lightning, 1 Thunder)", defaultCards.size());
        return defaultCards;
    }
    
    /**
     * Validates that a player has a properly initialized deck
     * @param deck The deck to validate
     * @return true if the deck is valid, false otherwise
     */
    public boolean validateDeck(Deck deck) {
        if (deck == null) {
            return false;
        }
        
        if (deck.getCards() == null || deck.getCards().isEmpty()) {
            logger.warn("Deck {} has no cards", deck.getId());
            return false;
        }
        
        if (deck.getCards().size() != DEFAULT_DECK_SIZE) {
            logger.warn("Deck {} has incorrect number of cards: {} != {}", 
                deck.getId(), deck.getCards().size(), DEFAULT_DECK_SIZE);
            return false;
        }
        
        return true;
    }
}