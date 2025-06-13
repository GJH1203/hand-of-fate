package com.cardgame.service.player;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import com.cardgame.dto.DeckDto;
import com.cardgame.dto.ImmutableDeckDto;
import com.cardgame.exception.player.DeckNotFoundException;
import com.cardgame.exception.player.InvalidDeckException;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.repository.DeckRepository;
import org.springframework.stereotype.Service;

@Service
public class DeckService {

    private final DeckRepository deckRepository;

    public DeckService(DeckRepository deckRepository) {
        this.deckRepository = deckRepository;
    }

    public Deck createDeck(String ownerId, List<Card> cards) {
        validateDeckSize(cards);

        Deck deck = new Deck();
        deck.setId(UUID.randomUUID().toString());
        deck.setOwnerId(ownerId);
        deck.setCards(new ArrayList<>(cards)); // Create a new list to avoid reference issues
        deck.setRemainingCards(cards.size());
        deck.validate(); // Set the isValid flag

        return deckRepository.save(deck);
    }

    public Deck addCardToDeck(String deckId, String ownerId, Card card) {
        Deck deck = getDeckWithOwner(deckId, ownerId);

        if (!deck.addCard(card)) {
            throw new InvalidDeckException("Cannot add card: deck is full");
        }

        return deckRepository.save(deck);
    }

    public Deck removeCardFromDeck(String deckId, String ownerId, String cardId) {
        Deck deck = getDeckWithOwner(deckId, ownerId);

        if (!deck.removeCard(cardId)) {
            throw new InvalidDeckException("Card not found in deck: " + cardId);
        }

        return deckRepository.save(deck);
    }

    /**
     * Get a deck by its ID
     */
    public Deck getDeck(String deckId) {
        return deckRepository.findById(deckId)
                .orElseThrow(() -> new DeckNotFoundException("Deck not found with ID: " + deckId));
    }

    /**
     * Get a deck ensuring it belongs to the specified owner
     */
    public Deck getDeckWithOwner(String deckId, String ownerId) {
        return deckRepository.findByIdAndOwnerId(deckId, ownerId)
                .orElseThrow(() -> new DeckNotFoundException(
                        "Deck not found with ID: " + deckId + " for owner: " + ownerId));
    }

    /**
     * Get all decks for a player
     */
    public List<Deck> getPlayerDecks(String playerId) {
        return deckRepository.findByOwnerId(playerId);
    }

    /**
     * Save or update a deck
     */
    public Deck saveDeck(Deck deck) {
        validateDeckSize(deck.getCards());
        return deckRepository.save(deck);
    }

    /**
     * Create a game-specific copy of a deck
     */
    public Deck createGameDeck(String originalDeckId, String ownerId) {
        Deck originalDeck = getDeckWithOwner(originalDeckId, ownerId);

        Deck gameDeck = new Deck();
        gameDeck.setId(UUID.randomUUID().toString());
        gameDeck.setOwnerId(ownerId);
        gameDeck.setCards(new ArrayList<>(originalDeck.getCards()));
        gameDeck.setRemainingCards(originalDeck.getCards().size());

        return deckRepository.save(gameDeck);
    }

    /**
     * Draw a specific number of cards from the deck
     */
    public List<Card> drawCards(String deckId, int count) {
        Deck deck = getDeck(deckId);

        if (deck.getRemainingCards() < count) {
            throw new InvalidDeckException("Not enough cards remaining in deck");
        }

        List<Card> drawnCards = new ArrayList<>(deck.getCards().subList(0, count));
        deck.getCards().subList(0, count).clear();
        deck.setRemainingCards(deck.getCards().size());

        deckRepository.save(deck);
        return drawnCards;
    }

    private void validateDeckSize(List<Card> cards) {
        if (cards == null || cards.size() != 5) {
            throw new InvalidDeckException("Deck must contain exactly 5 cards");
        }
    }

    /**
     * Convert Deck to DeckDto
     */
    public DeckDto convertToDto(Deck deck) {
        return ImmutableDeckDto.builder()
                .id(deck.getId())
                .ownerId(deck.getOwnerId())
                .cards(deck.getCards())
                .remainingCards(deck.getRemainingCards())
                .isValid(deck.isValid())
                .build();
    }
}
