package com.cardgame.service.util;

import com.cardgame.model.Card;
import com.cardgame.model.Player;

public class ScoreCalculator {
    public static void updatePlayerScore(Player player) {
        int totalScore = player.getPlacedCards().values().stream()
                .mapToInt(Card::getPower)
                .sum();
        player.setScore(totalScore);
    }
}
