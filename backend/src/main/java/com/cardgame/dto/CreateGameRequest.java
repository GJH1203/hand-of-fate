package com.cardgame.dto;

import java.util.Map;
import com.cardgame.model.GameState;
import com.cardgame.model.Position;
import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateGameRequest {
    @JsonProperty("gameState")
    private GameState gameState;
//    @JsonProperty("width")
//    private int width;
//    @JsonProperty("height")
//    private int height;
//    @JsonProperty("pieces")
//    private Map<Position, String> pieces;

    // getters and setters
    public GameState getGameState() {
        return gameState;
    }

    public void setGameState(GameState gameState) {
        this.gameState = gameState;
    }

//    public int getWidth() {
//        return width;
//    }
//
//    public void setWidth(int width) {
//        this.width = width;
//    }
//
//    public int getHeight() {
//        return height;
//    }
//
//    public void setHeight(int height) {
//        this.height = height;
//    }
//
//    public Map<Position, String> getPieces() {
//        return pieces;
//    }
//
//    public void setPieces(Map<Position, String> pieces) {
//        this.pieces = pieces;
//    }

    // equals and hashCode
}
