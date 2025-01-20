package com.cardgame.model;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "gameScores")
public class GameScore {

    @Id
    private String id;

    private String gameId;
    private Map<String, Integer> playerScores; // playerId -> score
    private long lastUpdated;
    private boolean isActive;

    public GameScore() {
        this.playerScores = new HashMap<>();
        this.lastUpdated = System.currentTimeMillis();
        this.isActive = true;
    }

    public GameScore(String gameId) {
        this();
        this.gameId = gameId;
    }

    public GameScore(String gameId, String playerId1, int score1, String playerId2, int score2) {
        this();
        this.gameId = gameId;
        this.playerScores.put(playerId1, score1);
        this.playerScores.put(playerId2, score2);
    }

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
    }

    public Map<String, Integer> getPlayerScores() {
        return playerScores;
    }

    public void setPlayerScores(Map<String, Integer> playerScores) {
        this.playerScores = playerScores;
    }

    public long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean isActive) {
        this.isActive = isActive;
    }

    public void updateScoreForGame(String playerId, int score) {
        this.playerScores.put(playerId, score);
        this.lastUpdated = System.currentTimeMillis();
    }

    public int getScoreForGame(String playerId) {
        return this.playerScores.get(playerId);
    }

    public void deactivate() {
        this.isActive = false;
    }

    public void endGame() {
        this.isActive = false;
        this.lastUpdated = System.currentTimeMillis();
    }
}
