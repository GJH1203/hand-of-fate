package com.cardgame.service;

import com.cardgame.dto.BoardDto;
import com.cardgame.dto.ImmutableBoardDto;
import com.cardgame.dto.ImmutablePositionDto;
import com.cardgame.model.Board;
import com.cardgame.model.Position;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BoardService {

    public BoardDto createBoard(int width, int height, Map<String, String> pieces) {
        Board board = new Board(width, height, pieces);
        return convertToDto(board);
    }

    public BoardDto updateBoard(Board board, int width, int height, Map<String, String> pieces) {
        board.setWidth(width);
        board.setHeight(height);
        // No conversion needed
        board.setPieces(pieces);
        return convertToDto(board);
    }

    public Map<String, String> getPieces(Board board) {
        return board.getPieces();
    }

    private BoardDto convertToDto(Board board) {
        // Keep the positions as strings for proper JSON serialization
        // The board already stores positions as "x,y" strings
        return ImmutableBoardDto.builder()
                .width(board.getWidth())
                .height(board.getHeight())
                .pieces(board.getPieces())  // Use the string keys directly
                .build();
    }

}
