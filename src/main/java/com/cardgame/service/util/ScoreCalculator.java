package com.cardgame.service.util;

import com.cardgame.model.Card;
import com.cardgame.model.GameModel;
import com.cardgame.model.Player;
import java.util.Map;

/**
 * Utility class to calculate and update player scores.
 */
public class ScoreCalculator {

    /**
     * Updates a player's score based on their placed cards.
     * This is called each time a card is placed on the board.
     *
     * @param player The player whose score should be updated
     */
    public static void updatePlayerScore(Player player, GameModel gameModel) {
        int score = 0;

        // Calculate score based on placed cards
        Map<String, Card> placedCards = player.getPlacedCards();
        for (Card card : placedCards.values()) {
            score += card.getPower();
        }

        // Set the player's score
        player.setScore(score);

        // Update game model scores
        Map<String, Integer> gameScores = gameModel.getScores();
        gameScores.put(player.getId(), score);
        gameModel.setScores(gameScores);
    }

    /**
     * Determines the winner of the game based on player scores.
     * Returns null if there's a tie.
     *
     * @param gameModel The game model containing player scores
     * @return The ID of the winning player, or null if there's a tie or no scores
     */
    public static String determineWinner(GameModel gameModel) {
        Map<String, Integer> scores = gameModel.getScores();
        if (scores.isEmpty()) {
            // No scores recorded, can't determine winner
            return null;
        }

        // Find the highest score
        int highestScore = -1;
        String winningPlayerId = null;
        boolean isTie = false;

        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            String playerId = entry.getKey();
            int score = entry.getValue();

            if (score > highestScore) {
                highestScore = score;
                winningPlayerId = playerId;
                isTie = false;
            } else if (score == highestScore) {
                // We have a tie
                isTie = true;
            }
        }

        // If there's a tie, return null
        return isTie ? null : winningPlayerId;
    }

}
