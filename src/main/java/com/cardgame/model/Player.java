package com.cardgame.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "players")
public class Player {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    @Indexed(unique = true)
    private String email;

    @Indexed(unique = true)
    private String nakamaUserId;

    @Indexed(unique = true)
    private String supabaseUserId;

    @DBRef(lazy = true)
    private Deck currentDeck;

    @DBRef(lazy = true)
    @Field("original_deck")
    private Deck originalDeck;

    @Field("hand")
    private List<Card> hand = new ArrayList<>();

    @Field("score")
    private int score;

    @Field("placed_cards")
    private Map<String, Card> placedCards = new HashMap<>();

    @Field("lifetime_score")
    private int lifetimeScore = 0;

    @Field("has_completed_onboarding")
    private boolean hasCompletedOnboarding = false;

    @Field("onboarding_completed_at")
    private LocalDateTime onboardingCompletedAt;

    @Field("tutorial_game_id")
    private String tutorialGameId;

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

    public Deck getOriginalDeck() {
        return originalDeck;
    }

    public void setOriginalDeck(Deck originalDeck) {
        this.originalDeck = originalDeck;
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

    public int getLifetimeScore() {
        return lifetimeScore;
    }

    public void setLifetimeScore(int lifetimeScore) {
        this.lifetimeScore = lifetimeScore;
    }

    /**
     * Add points to the player's lifetime score
     * @param points The points to add
     */
    public void addLifetimeScore(int points) {
        this.lifetimeScore += points;
    }


    public String getNakamaUserId() {
        return nakamaUserId;
    }

    public void setNakamaUserId(String nakamaUserId) {
        this.nakamaUserId = nakamaUserId;
    }

    public String getSupabaseUserId() {
        return supabaseUserId;
    }

    public void setSupabaseUserId(String supabaseUserId) {
        this.supabaseUserId = supabaseUserId;
    }

    public boolean hasCompletedOnboarding() {
        return hasCompletedOnboarding;
    }

    public void setHasCompletedOnboarding(boolean hasCompletedOnboarding) {
        this.hasCompletedOnboarding = hasCompletedOnboarding;
    }

    public LocalDateTime getOnboardingCompletedAt() {
        return onboardingCompletedAt;
    }

    public void setOnboardingCompletedAt(LocalDateTime onboardingCompletedAt) {
        this.onboardingCompletedAt = onboardingCompletedAt;
    }

    public String getTutorialGameId() {
        return tutorialGameId;
    }

    public void setTutorialGameId(String tutorialGameId) {
        this.tutorialGameId = tutorialGameId;
    }

    /**
     * Mark onboarding as completed
     */
    public void completeOnboarding() {
        this.hasCompletedOnboarding = true;
        this.onboardingCompletedAt = LocalDateTime.now();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }


}
