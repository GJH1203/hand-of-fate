package com.cardgame.model;

import java.time.LocalDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "gameResults")
public class GameResult {

    @Id
    private String id;

    private String gameId;
    private String winnerId;  // null for tie
    private String player1Id;
    private String player2Id;
    private int player1Score;
    private int player2Score;
    private EndCondition endCondition;
    private long timestamp;

    public GameResult() {
        this.timestamp = System.currentTimeMillis();
    }

    public GameResult(String gameId, String player1Id, String player2Id) {
        this();
        this.gameId = gameId;
        this.player1Id = player1Id;
        this.player2Id = player2Id;
        this.timestamp = System.currentTimeMillis();
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

    public String getWinnerId() {
        return winnerId;
    }

    public void setWinnerId(String winnerId) {
        this.winnerId = winnerId;
    }

    public String getPlayer1Id() {
        return player1Id;
    }

    public void setPlayer1Id(String player1Id) {
        this.player1Id = player1Id;
    }

    public String getPlayer2Id() {
        return player2Id;
    }

    public void setPlayer2Id(String player2Id) {
        this.player2Id = player2Id;
    }

    public int getPlayer1Score() {
        return player1Score;
    }

    public void setPlayer1Score(int player1Score) {
        this.player1Score = player1Score;
    }

    public int getPlayer2Score() {
        return player2Score;
    }

    public void setPlayer2Score(int player2Score) {
        this.player2Score = player2Score;
    }

    public EndCondition getEndCondition() {
        return endCondition;
    }

    public void setEndCondition(EndCondition endCondition) {
        this.endCondition = endCondition;
    }

    public long getTimestampInGameResult() {
        return timestamp;
    }

    public void setTimestampInGameResult(long timestamp) {
        this.timestamp = timestamp;
    }

}
