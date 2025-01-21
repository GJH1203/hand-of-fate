package com.cardgame.model;
import java.util.HashMap;
import java.util.Map;

public class Board {
    private int width;
    private int height;
    private Map<Position, String> pieces;

    public Board() {
        this.width = 3;
        this.height = 5;
        this.pieces = new HashMap<>();
    }

    public Board(int width, int height, Map<Position, String> pieces) {
        this.width = width;
        this.height = height;
        this.pieces = pieces;
    }

    public int getWidth() {
        return width;
    }

    public void setWidth(int width) {
        this.width = width;
    }

    public int getHeight() {
        return height;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public Map<Position, String> getPieces() {
        return pieces;
    }

    public void setPieces(Map<Position, String> pieces) {
        this.pieces = pieces;
    }

    public boolean isPositionValid(Position position) {
        return position.getX() >= 0 && position.getX() < width &&
                position.getY() >= 0 && position.getY() < height;
    }

    public boolean isPositionEmpty(Position position) {
        return !pieces.containsKey(position);
    }

    public void placeCard(Position position, String cardId) {
        if (!isPositionValid(position)) {
            throw new IllegalArgumentException("Invalid position");
        }
        pieces.put(position, cardId);
    }
}
