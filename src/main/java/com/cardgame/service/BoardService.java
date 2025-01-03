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

    public BoardDto createBoard(int width, int height, Map<Position, String> pieces) {
        Board board = new Board(width, height, pieces);
        return convertToDto(board);
    }

    public BoardDto updateBoard(Board board, int width, int height, Map<Position, String> pieces) {
        board.setWidth(width);
        board.setHeight(height);
        board.setPieces(pieces);
        return convertToDto(board);
    }

    public Map<Position, String> getPieces(Board board) {
        return board.getPieces();
    }

    private BoardDto convertToDto(Board board) {
        return ImmutableBoardDto.builder()
                .width(board.getWidth())
                .height(board.getHeight())
                .pieces(board.getPieces().entrySet().stream()
                        .collect(Collectors.toMap(
                                entry -> ImmutablePositionDto.builder()
                                        .x(entry.getKey().getX())
                                        .y(entry.getKey().getY())
                                        .build(),
                                Map.Entry::getValue
                        )))
                .build();
    }

}
