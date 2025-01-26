package com.cardgame.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "games")
public class GameModel {

    @Id // Marks the primary key for this document's ID
    private String id;

    private GameState gameState;

    private Board board;

    private Instant createdAt;

    private Instant updatedAt;

    private String currentPlayerId;

    private List<String> playerIds;

    // constructor, getters, and setters
    public GameModel() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public GameModel(String id, GameState gameState, Board board) {
        this.id = id;
        this.gameState = gameState;
        this.board = board;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public GameState getGameState() {
        return gameState;
    }

    public void setGameState(GameState gameState) {
        this.gameState = gameState;
    }

    public Board getBoard() {
        return board;
    }

    public void setBoard(Board board) {
        this.board = board;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCurrentPlayerId() {
        return currentPlayerId;
    }

    public void setCurrentPlayerId(String currentPlayerId) {
        this.currentPlayerId = currentPlayerId;
    }

    public List<String> getPlayerIds() {
        return playerIds;
    }

    public void setPlayerIds(List<String> playerIds) {
        this.playerIds = playerIds;
    }

    @Override
    public String toString() {
        return "Game{" +
                "id='" + id + '\'' +
                ", gameState=" + gameState +
                ", board=" + board +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }

    public void updateGame(GameState gameState, Board board) {
        this.gameState = gameState;
        this.board = board;
        this.updatedAt = Instant.now();
    }

}
