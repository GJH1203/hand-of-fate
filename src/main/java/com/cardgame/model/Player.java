package com.cardgame.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "players")
public class Player {

    @Id
    private String id;

    @Indexed(unique = true)  // Add this if names should be unique
    private String name;

    @DBRef(lazy = true)  // Add lazy loading for better performance
    private Deck currentDeck;

    @Field("hand")
    private List<Card> hand = new ArrayList<>();

    @Field("score")
    private int score;

    @Field("placed_cards")
    private Map<String, Card> placedCards = new HashMap<>();

    // Default constructor
    public Player() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Deck getCurrentDeck() {
        return currentDeck;
    }

    public void setCurrentDeck(Deck currentDeck) {
        this.currentDeck = currentDeck;
    }

    public List<Card> getHand() {
        return hand;
    }

    public void setHand(List<Card> hand) {
        this.hand = hand;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public Map<String, Card> getPlacedCards() {
        return placedCards;
    }

    public void setPlacedCards(Map<String, Card> placedCards) {
        this.placedCards = placedCards;
    }

    /**
     * Nakama
     */
    @Indexed
    private String nakamaUserId;  // Link with Nakama

    private String email;  // Store email for reference

    public String getNakamaUserId() {
        return nakamaUserId;
    }

    public void setNakamaUserId(String nakamaUserId) {
        this.nakamaUserId = nakamaUserId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }


}
