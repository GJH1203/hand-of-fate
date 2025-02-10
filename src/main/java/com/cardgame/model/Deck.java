package com.cardgame.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a deck of cards, owned and built by a player.
 */
@Document(collection = "deck")
public class Deck {

    @Id
    private String id;

    @Field
    private String ownerId;

    @Field
    private List<Card> cards = new ArrayList<>();

    @Field("remaining_cards")
    private int remainingCards;

    @Field("is_valid")
    private boolean isValid;

    public Deck() {
    }

    public Deck(String ownerId, List<Card> cards) {
        this.ownerId = ownerId;
        this.cards = cards;
        this.remainingCards = cards.size();
    }

    // Add methods for deck manipulation
    public boolean addCard(Card card) {
        if (cards.size() >= 15) {
            return false;
        }
        cards.add(card);
        remainingCards = cards.size();
        validate();
        return true;
    }

    public boolean removeCard(String cardId) {
        boolean removed = cards.removeIf(card -> card.getId().equals(cardId));
        if (removed) {
            remainingCards = cards.size();
            validate();
        }
        return removed;
    }

    public void validate() {
        isValid = cards.size() == 15;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }

    public List<Card> getCards() {
        return cards;
    }

    public void setCards(List<Card> cards) {
        this.cards = cards;
    }

    public int getRemainingCards() {
        return remainingCards;
    }

    public void setRemainingCards(int remainingCards) {
        this.remainingCards = remainingCards;
    }

    public boolean isValid() {
        return isValid;
    }

    public void setValid(boolean valid) {
        isValid = valid;
    }

}
