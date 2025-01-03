package com.cardgame.service;

import com.cardgame.model.Board;
import com.cardgame.model.Position;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class BoardService {

    public Board createBoard(int width, int height, Map<Position, String> pieces) {
        return new Board(width, height, pieces);
    }

    public Board updateBoard(Board board, int width, int height, Map<Position, String> pieces) {
        board.setWidth(width);
        board.setHeight(height);
        board.setPieces(pieces);
        return board;
    }

    public Map<Position, String> getPieces(Board board) {
        return board.getPieces();
    }

}
