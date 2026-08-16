package com.cardgame.service.util;

import com.cardgame.model.Card;
import com.cardgame.model.GameModel;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.service.player.PlayerService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Utility class to calculate and update player scores using column-based scoring.
 * Each column is scored independently, and the winner is determined by who wins the most columns.
 */
public class ScoreCalculator {
    
    /**
     * Column score data containing the score for each player in a column
     */
    public static class ColumnScore {
        public Map<String, Integer> playerScores = new HashMap<>();
        public String winnerId = null;
        public boolean isTie = false;
        
        public ColumnScore() {
            // Initialize with empty scores
        }
    }
    
    /**
     * Calculate column scores for the current game state
     * @param gameModel The game model
     * @param playerService Service to retrieve player data
     * @return Map of column index to ColumnScore
     */
    public static Map<Integer, ColumnScore> calculateColumnScores(GameModel gameModel, PlayerService playerService) {
        Map<Integer, ColumnScore> columnScores = new HashMap<>();
        
        // Get board width dynamically from the game model
        int boardWidth = gameModel.getBoard().getWidth();
        
        // Initialize column scores for each column
        for (int col = 0; col < boardWidth; col++) {
            ColumnScore colScore = new ColumnScore();
            // Initialize all players with 0 score
            for (String playerId : gameModel.getPlayerIds()) {
                colScore.playerScores.put(playerId, 0);
            }
            columnScores.put(col, colScore);
        }
        
        // Calculate scores for each player
        for (String playerId : gameModel.getPlayerIds()) {
            Player player = playerService.getPlayer(playerId);
            Map<String, Card> placedCards = player.getPlacedCards();
            
            if (placedCards != null) {
                for (Map.Entry<String, Card> entry : placedCards.entrySet()) {
                    String positionKey = entry.getKey();
                    Card card = entry.getValue();
                    
                    // Parse position to get column
                    Position pos = Position.fromStorageString(positionKey);
                    int column = pos.getX();
                    
                    // Add card power to player's column score
                    ColumnScore colScore = columnScores.get(column);
                    colScore.playerScores.merge(playerId, card.getPower(), Integer::sum);
                }
            }
        }
        
        // Determine winner for each column
        for (ColumnScore colScore : columnScores.values()) {
            determineColumnWinner(colScore);
        }
        
        return columnScores;
    }
    
    /**
     * Determine the winner of a single column
     * @param columnScore The column score to evaluate
     */
    public static void determineColumnWinner(ColumnScore columnScore) {
        int highestScore = -1;
        String winnerId = null;
        boolean isTie = false;
        int playersWithHighestScore = 0;
        
        for (Map.Entry<String, Integer> entry : columnScore.playerScores.entrySet()) {
            String playerId = entry.getKey();
            int score = entry.getValue();
            
            if (score > highestScore) {
                highestScore = score;
                winnerId = playerId;
                playersWithHighestScore = 1;
            } else if (score == highestScore) {
                playersWithHighestScore++;
            }
        }
        
        // If multiple players have the highest score, it's a tie
        isTie = playersWithHighestScore > 1;
        
        // If highest score is 0, it's also considered a tie (empty column).
        // This is the intended behavior as per game design, even if cards with power 0 are placed.
        if (highestScore == 0) {
            isTie = true;
            winnerId = null;
        }
        
        columnScore.winnerId = isTie ? null : winnerId;
        columnScore.isTie = isTie;
    }

    /**
     * Updates player scores based on column wins.
     * The score is now the number of columns won.
     */
    public static void updatePlayerScore(Player player, GameModel gameModel) {
        // This method is called for backward compatibility
        // Actual scoring is now based on columns won, calculated in determineWinner
    }

    /**
     * Determines the winner of the game based on column victories.
     * The player who wins the most columns (2 out of 3) wins the game.
     *
     * @param gameModel The game model
     * @param playerService Service to retrieve player data
     * @return The ID of the winning player, or null if there's a tie
     */
    public static String determineWinner(GameModel gameModel, PlayerService playerService) {
        Map<Integer, ColumnScore> columnScores = calculateColumnScores(gameModel, playerService);
        
        // Count columns won by each player
        Map<String, Integer> columnsWon = new HashMap<>();
        for (String playerId : gameModel.getPlayerIds()) {
            columnsWon.put(playerId, 0);
        }
        
        // Count column victories
        for (ColumnScore colScore : columnScores.values()) {
            if (colScore.winnerId != null && !colScore.isTie) {
                columnsWon.merge(colScore.winnerId, 1, Integer::sum);
            }
        }
        
        // Update game scores with columns won
        gameModel.setScores(new HashMap<>(columnsWon));
        
        // Determine overall winner (who won most columns)
        int mostColumnsWon = -1;
        String gameWinner = null;
        boolean isGameTie = false;
        
        for (Map.Entry<String, Integer> entry : columnsWon.entrySet()) {
            String playerId = entry.getKey();
            int columns = entry.getValue();
            
            if (columns > mostColumnsWon) {
                mostColumnsWon = columns;
                gameWinner = playerId;
                isGameTie = false;
            } else if (columns == mostColumnsWon) {
                isGameTie = true;
            }
        }
        
        return isGameTie ? null : gameWinner;
    }
    
    /**
     * @deprecated This method is retained for backward compatibility but does nothing.
     * Use {@link #determineWinner(GameModel, PlayerService)} for scoring logic.
     */
    @Deprecated
    public static String determineWinner(GameModel gameModel) {
        // This should not be called anymore, but kept for compatibility
        throw new UnsupportedOperationException("Use determineWinner(GameModel, PlayerService) instead");
    }
}
