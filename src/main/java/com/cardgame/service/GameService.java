package com.cardgame.service;

import com.cardgame.dto.*;
import com.cardgame.model.Board;
import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import com.cardgame.model.Position;
import com.cardgame.repository.GameRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GameService {
    private final GameRepository gameRepository;

    public GameService(GameRepository gameRepository) {
        this.gameRepository = gameRepository;
    }

    public GameDto createGame(GameState gameState, int width, int height, Map<Position, String> pieces) {
        Board board = new Board(width, height, pieces);
        GameModel gameModel = new GameModel(null, gameState, board);
        gameModel = (GameModel) gameRepository.save(gameModel);
        return convertToDto(gameModel);
    }

    public GameDto updateGame(String gameId, GameState gameState, int width, int height, Map<Position, String> pieces) throws Throwable {
        GameModel gameModel = (GameModel) gameRepository
                .findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        Board board = new Board(width, height, pieces);
        gameModel.updateGame(gameState, board);
        gameModel = (GameModel) gameRepository.save(gameModel);
        return convertToDto(gameModel);
    }

    private GameDto convertToDto(GameModel gameModel) {
        return ImmutableGameDto.builder()
                .id(gameModel.getId())
                .state(gameModel.getGameState())
                .board(ImmutableBoardDto.builder()
                        .width(gameModel.getBoard().getWidth())
                        .height(gameModel.getBoard().getHeight())
                        .pieces(convertPiecesToDto(gameModel.getBoard().getPieces()))
                        .build())
                .createdAt(gameModel.getCreatedAt())
                .updatedAt(gameModel.getUpdatedAt())
                .build();
    }

    private Map<PositionDto, String> convertPiecesToDto(Map<Position, String> pieces) {
        return pieces.entrySet().stream()
                .collect(Collectors.toMap(
                        entry -> ImmutablePositionDto.builder()
                                .x(entry.getKey().getX())
                                .y(entry.getKey().getY())
                                .build(),
                        Map.Entry::getValue
                ));
    }
}
