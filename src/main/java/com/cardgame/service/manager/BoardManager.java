package com.cardgame.service.manager;

import java.util.List;
import com.cardgame.model.Board;
import com.cardgame.model.Position;
import org.springframework.stereotype.Service;

@Service
public class BoardManager {
    public void placeCard(Board board, Position position, String cardId) {
        board.placeCard(position, cardId);
    }

    public boolean isValidPosition(Board board, Position position) {
        return board.isPositionValid(position) && board.isPositionEmpty(position);
    }

    public List<Position> getAdjacentPositions(Board board, Position position) {
        return board.getAdjacentPositions(position);
    }

    public boolean isFull(Board board) {
        return board.isFull();
    }
}
