package com.cardgame.model;
import java.util.Map;

public class Board {
    private int width;
    private int height;
    private Map<Position, String> pieces;

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
}
