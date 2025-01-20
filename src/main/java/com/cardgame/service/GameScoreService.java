package com.cardgame.service;

import java.util.List;
import com.cardgame.model.EndCondition;
import com.cardgame.model.GameScore;
import com.cardgame.repository.GameScoreRepository;
import org.springframework.stereotype.Service;

@Service
public class GameScoreService {
    private final GameScoreRepository gameScoreRepository;

    public GameScoreService(GameScoreRepository gameScoreRepository) {
        this.gameScoreRepository = gameScoreRepository;
    }

    public GameScore initializeGameScore(String gameId) {
        GameScore gameScore = new GameScore(gameId);
        return gameScoreRepository.save(gameScore);
    }

    public GameScore updatePlayerScore(String gameId, String playerId, int score) {
        GameScore gameScore = gameScoreRepository.findByGameId(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found: " + gameId));

        gameScore.updateScoreForGame(playerId, score);
        return gameScoreRepository.save(gameScore);
    }

    public GameScore getGameScore(String gameId) {
        return gameScoreRepository.findByGameId(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found: " + gameId));
    }

    public List<GameScore> getRecentGameScores(long sinceTimestamp) {
        return gameScoreRepository.findByLastUpdatedGreaterThan(sinceTimestamp);
    }

    public void finalizeGameScore(String gameId, EndCondition endCondition, String winnerId) {
        GameScore gameScore = getGameScore(gameId);
        gameScore.endGame();
        gameScoreRepository.save(gameScore);
    }

    public GameScore restoreGameScore(String gameId) {
        return gameScoreRepository.findByGameIdAndIsActiveTrue(gameId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No active game found: " + gameId));
    }
}
