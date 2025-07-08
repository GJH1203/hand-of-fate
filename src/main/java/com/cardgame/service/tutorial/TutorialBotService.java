package com.cardgame.service.tutorial;

import com.cardgame.model.Board;
import com.cardgame.model.Card;
import com.cardgame.model.GameModel;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.service.player.PlayerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Simple Bot AI for tutorial games
 * The bot makes basic strategic moves to provide a learning experience
 */
@Service
public class TutorialBotService {
    private static final Logger logger = LoggerFactory.getLogger(TutorialBotService.class);
    private static final Random random = new Random();
    
    private final PlayerService playerService;

    public TutorialBotService(PlayerService playerService) {
        this.playerService = playerService;
    }

    /**
     * Make a move for the tutorial bot
     * @param gameModel The current game state
     * @param botPlayerId The bot player ID
     * @return The bot's move (card and position)
     */
    public BotMove makeBotMove(GameModel gameModel, String botPlayerId) {
        logger.info("Tutorial bot making move for player: {}", botPlayerId);
        
        Player botPlayer = playerService.getPlayer(botPlayerId);
        if (botPlayer.getHand() == null || botPlayer.getHand().isEmpty()) {
            logger.warn("Bot has no cards in hand");
            return null;
        }

        // Get available positions on the board
        List<Position> availablePositions = getAvailablePositions(gameModel.getBoard());
        if (availablePositions.isEmpty()) {
            logger.warn("No available positions on board");
            return null;
        }

        // Simple bot strategy: prefer middle columns, then random
        Position chosenPosition = chooseBestPosition(availablePositions);
        Card chosenCard = chooseBestCard(botPlayer.getHand(), chosenPosition);

        logger.info("Bot chose card '{}' (power: {}) at position ({}, {})", 
                   chosenCard.getName(), chosenCard.getPower(), 
                   chosenPosition.getX(), chosenPosition.getY());

        return new BotMove(chosenCard, chosenPosition);
    }

    /**
     * Get all available positions on the board
     */
    private List<Position> getAvailablePositions(Board board) {
        List<Position> available = new ArrayList<>();
        
        // Board is 3x5 (3 columns, 5 rows)
        for (int x = 0; x < 3; x++) {
            for (int y = 0; y < 5; y++) {
                Position pos = new Position(x, y);
                String posKey = x + "," + y;
                
                // Check if position is empty
                if (board.getPieces() == null || !board.getPieces().containsKey(posKey)) {
                    available.add(pos);
                }
            }
        }
        
        return available;
    }

    /**
     * Choose the best position using simple strategy
     * Priority: middle column (1) > side columns (0, 2)
     */
    private Position chooseBestPosition(List<Position> availablePositions) {
        // Prefer middle column (x = 1)
        List<Position> middleColumn = availablePositions.stream()
                .filter(pos -> pos.getX() == 1)
                .toList();
        
        if (!middleColumn.isEmpty()) {
            return middleColumn.get(random.nextInt(middleColumn.size()));
        }
        
        // If middle column full, choose randomly from available
        return availablePositions.get(random.nextInt(availablePositions.size()));
    }

    /**
     * Choose the best card from hand
     * Strategy: Use medium-power cards first, save strong cards for later
     */
    private Card chooseBestCard(List<Card> hand, Position position) {
        // For tutorial, use cards with power 3-6 preferentially
        List<Card> mediumCards = hand.stream()
                .filter(card -> card.getPower() >= 3 && card.getPower() <= 6)
                .toList();
        
        if (!mediumCards.isEmpty()) {
            return mediumCards.get(random.nextInt(mediumCards.size()));
        }
        
        // If no medium cards, use any available card
        return hand.get(random.nextInt(hand.size()));
    }

    /**
     * Check if bot should pass (simple logic - pass if hand is very weak)
     */
    public boolean shouldBotPass(GameModel gameModel, String botPlayerId) {
        Player botPlayer = playerService.getPlayer(botPlayerId);
        
        if (botPlayer.getHand() == null || botPlayer.getHand().isEmpty()) {
            return true;
        }
        
        // Bot passes if all cards in hand are very weak (power < 2)
        boolean allWeak = botPlayer.getHand().stream()
                .allMatch(card -> card.getPower() < 2);
        
        // Add some randomness - bot might pass 20% of the time even with good cards
        // This makes the tutorial more realistic
        boolean randomPass = random.nextDouble() < 0.2;
        
        return allWeak || randomPass;
    }

    /**
     * Represents a bot's move
     */
    public static class BotMove {
        private final Card card;
        private final Position position;

        public BotMove(Card card, Position position) {
            this.card = card;
            this.position = position;
        }

        public Card getCard() {
            return card;
        }

        public Position getPosition() {
            return position;
        }
    }
}