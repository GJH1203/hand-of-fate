package com.cardgame.model;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Board {
    // Orthogonal direction vectors: North, South, East, West
    private static final int[] ORTHOGONAL_DX = {0, 0, 1, -1};
    private static final int[] ORTHOGONAL_DY = {1, -1, 0, 0};
    
    private int width;
    private int height;
    private Map<String, String> pieces;

    public Board() {
        this.width = 3;
        this.height = 5;
        this.pieces = new HashMap<>();
    }

    public Board(int width, int height, Map<String, String> pieces) {
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

    public Map<String, String> getPieces() {
        return pieces;
    }

    public void setPieces(Map<String, String> pieces) {
        this.pieces = pieces;
    }

    public boolean isPositionValid(Position position) {
        return position.getX() >= 0 && position.getX() < width &&
                position.getY() >= 0 && position.getY() < height;
    }

    public boolean isPositionEmpty(Position position) {
        return !pieces.containsKey(position.toStorageString());
    }

    public List<Position> getAdjacentPositions(Position pos) {
        List<Position> adjacent = new ArrayList<>();

        for (int i = 0; i < ORTHOGONAL_DX.length; i++) {
            int newX = pos.getX() + ORTHOGONAL_DX[i];
            int newY = pos.getY() + ORTHOGONAL_DY[i];
            Position newPos = new Position(newX, newY);
            if (isPositionValid(newPos)) {
                adjacent.add(newPos);
            }
        }
        return adjacent;
    }

    public boolean isFull() {
        return pieces.size() >= width * height;
    }

    public void placeCard(Position position, String cardId) {
        if (!isPositionValid(position)) {
            throw new IllegalArgumentException("Invalid position");
        }
        if (!isPositionEmpty(position)) {
            throw new IllegalArgumentException("Position already occupied");
        }
        pieces.put(position.toStorageString(), cardId);
    }

    public List<Position> getEmptyPositions() {
        List<Position> empty = new ArrayList<>();
        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                Position pos = new Position(x, y);
                if (isPositionEmpty(pos)) {
                    empty.add(pos);
                }
            }
        }
        return empty;
    }

    public String getCardIdAt(Position position) {
        return pieces.get(position.toStorageString());
    }
}
