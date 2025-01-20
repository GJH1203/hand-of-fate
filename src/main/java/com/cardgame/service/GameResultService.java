package com.cardgame.service;

import java.util.List;
import java.util.Map;
import com.cardgame.model.EndCondition;
import com.cardgame.model.GameResult;
import com.cardgame.model.GameScore;
import com.cardgame.repository.GameResultRepository;
import org.springframework.stereotype.Service;

@Service
public class GameResultService {
    private final GameResultRepository gameResultRepository;

    public GameResultService(GameResultRepository gameResultRepository) {
        this.gameResultRepository = gameResultRepository;
    }

    public GameResult createGameResult(GameScore gameScore, EndCondition endCondition, String winnerId) {
        GameResult result = new GameResult();
        result.setGameId(gameScore.getGameId());

        // Get players from the score map
        Map<String, Integer> playerScores = gameScore.getPlayerScores();
        String[] playerIds = playerScores.keySet().toArray(new String[0]);

        // Set player IDs and scores
        if (playerIds.length >= 2) {
            result.setPlayer1Id(playerIds[0]);
            result.setPlayer2Id(playerIds[1]);
            result.setPlayer1Score(playerScores.get(playerIds[0]));
            result.setPlayer2Score(playerScores.get(playerIds[1]));
        } else {
            throw new IllegalStateException("Game score must have at least 2 players");
        }

        result.setWinnerId(winnerId);
        result.setEndCondition(endCondition);
        result.setTimestampInGameResult(System.currentTimeMillis());

        return gameResultRepository.save(result);
    }

    // Alternative version if you need to specify which player is player1/player2
    public GameResult createGameResult(GameScore gameScore, String player1Id, String player2Id,
                                       EndCondition endCondition, String winnerId) {
        GameResult result = new GameResult();
        result.setGameId(gameScore.getGameId());

        Map<String, Integer> playerScores = gameScore.getPlayerScores();

        // Verify both players exist in the score map
        if (!playerScores.containsKey(player1Id) || !playerScores.containsKey(player2Id)) {
            throw new IllegalArgumentException("Specified players not found in game score");
        }

        result.setPlayer1Id(player1Id);
        result.setPlayer2Id(player2Id);
        result.setPlayer1Score(playerScores.get(player1Id));
        result.setPlayer2Score(playerScores.get(player2Id));

        result.setWinnerId(winnerId);
        result.setEndCondition(endCondition);
        result.setTimestampInGameResult(System.currentTimeMillis());

        return gameResultRepository.save(result);
    }

    public List<GameResult> getPlayerGameHistory(String playerId) {
        return gameResultRepository.findByPlayer1IdOrPlayer2Id(playerId, playerId);
    }

    public List<GameResult> getPlayerWins(String playerId) {
        return gameResultRepository.findByWinnerId(playerId);
    }

    public List<GameResult> getRecentGames(long sinceTimestamp) {
        return gameResultRepository.findByTimestampGreaterThan(sinceTimestamp);
    }

    public List<GameResult> getGamesInPeriod(long startTime, long endTime) {
        return gameResultRepository.findByTimestampBetween(startTime, endTime);
    }


}
