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
    private static final int DEFAULT_DECK_SIZE = 15;
    private static final String DEFAULT_CARD_ID = "1";
    
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
     * @return List of default cards
     */
    private List<Card> createDefaultCards() {
        List<Card> defaultCards = new ArrayList<>();
        
        // Get the template card from the database
        Card templateCard = cardRepository.findById(DEFAULT_CARD_ID)
                .orElseThrow(() -> new RuntimeException("Default card template with ID " + DEFAULT_CARD_ID + " not found. Please ensure database is initialized."));
        
        // Create unique instances of the card
        for (int i = 0; i < DEFAULT_DECK_SIZE; i++) {
            Card uniqueCard = new Card();
            uniqueCard.setId("default_" + UUID.randomUUID().toString());
            uniqueCard.setPower(templateCard.getPower());
            uniqueCard.setName(templateCard.getName() + " #" + (i + 1));
            defaultCards.add(uniqueCard);
        }
        
        logger.debug("Created {} default cards for new deck", defaultCards.size());
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
        
        if (deck.getCards().size() < DEFAULT_DECK_SIZE) {
            logger.warn("Deck {} has insufficient cards: {} < {}", 
                deck.getId(), deck.getCards().size(), DEFAULT_DECK_SIZE);
            return false;
        }
        
        return true;
    }
}