package com.cardgame.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

@Document(collection = "games")
public class Game {

    @Id // Marks the primary key for this document's ID
    private String id;

    @Field("board") // Maps this field to the "board" field in MongoDB
    private Board board;

    @Field("PlayerIds") // Maps the player IDs
    private List<String> playerIds;

    @Field("currentPlayerIndex") // The index of the player in the playerIds list
    private int currentPlayerIndex;

    public Game(String id, List<String> playerIds) {
        this.id = id;
        this.board = new Board();
        this.playerIds = playerIds;
        this.currentPlayerIndex = 0;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Board getBoard() {
        return board;
    }

    public void setBoard(Board board) {
        this.board = board;
    }

    public List<String> getPlayerIds() {
        return playerIds;
    }

    public void setPlayerIds(List<String> playerIds) {
        this.playerIds = playerIds;
    }

    public int getCurrentPlayerIndex() {
        return currentPlayerIndex;
    }

    public void setCurrentPlayerIndex(int currentPlayerIndex) {
        this.currentPlayerIndex = currentPlayerIndex;
    }
}
