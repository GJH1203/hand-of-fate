package com.cardgame.service;

import com.cardgame.dto.BoardDto;
import com.cardgame.dto.GameDto;
import com.cardgame.dto.ImmutableGameDto;
import com.cardgame.model.Board;
import com.cardgame.model.GameModel;
import com.cardgame.repository.GameRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class GameService {
    private final GameRepository gameRepository;

    public GameService(GameRepository gameRepository) {
        this.gameRepository = gameRepository;
    }

    public GameDto createGame(GameDto gameDto) {
        // Convert DTO to entity
        GameModel game = new GameModel();
        game.setGameState(gameDto.getState());
        game.setBoard(convertBoardDtoToEntity(gameDto.getBoard()));
        game.setCreatedAt(Instant.now());
        game.setUpdatedAt(Instant.now());

        // Save entity
        GameModel savedGame = (GameModel) gameRepository.save(game);

        // Convert back to DTO
        return ImmutableGameDto.builder()
                .id(savedGame.getId())
                .state(savedGame.getGameState())
                .board(convertBoardToDto(savedGame.getBoard()))
                .createdAt(savedGame.getCreatedAt())
                .updatedAt(savedGame.getUpdatedAt())
                .build();
    }

    private BoardDto convertBoardToDto(Board board) {
        return null;
    }

    private Board convertBoardDtoToEntity(BoardDto dto) {
//        Board board = new Board();
//        board.setWidth(dto.getWidth());
//        board.setHeight(dto.getHeight());
//        board.setPieces(convertPositionsToEntity(dto.getPieces()));
//        return board;
        return null;
    }

}
