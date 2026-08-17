package com.cardgame.service;

import com.cardgame.model.*;
import com.cardgame.service.util.ScoreCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Scoring is a function of the game and nothing else, so this needs no Spring context,
 * no database and no mock. It used to mock PlayerService, because the cards a player had
 * on the board were on their player document.
 */
class ColumnScoringTest {

    private GameModel gameModel;
    private String player1Id = "player1";
    private String player2Id = "player2";

    @BeforeEach
    void setUp() {
        // Initialize game model
        gameModel = new GameModel();
        gameModel.setId("test-game-id");
        gameModel.setGameState(GameState.IN_PROGRESS);
        gameModel.setPlayerIds(Arrays.asList(player1Id, player2Id));
        
        // Initialize board
        Board board = new Board();
        board.setWidth(3);
        board.setHeight(5);
        board.setPieces(new HashMap<>());
        gameModel.setBoard(board);
    }

    @Test
    @DisplayName("Test empty board returns zero scores for all columns")
    void testEmptyBoard() {
        Map<Integer, ScoreCalculator.ColumnScore> columnScores = 
            ScoreCalculator.calculateColumnScores(gameModel);
        
        assertEquals(3, columnScores.size());
        
        for (int i = 0; i < 3; i++) {
            ScoreCalculator.ColumnScore colScore = columnScores.get(i);
            assertNotNull(colScore);
            assertEquals(0, colScore.playerScores.getOrDefault(player1Id, 0));
            assertEquals(0, colScore.playerScores.getOrDefault(player2Id, 0));
            assertNull(colScore.winnerId);
            assertTrue(colScore.isTie);
        }
    }

    @Test
    @DisplayName("Test single card in column gives that player the column")
    void testSingleCardWinsColumn() {
        // Place a card with power 5 for player1 in column 0
        placeCard(player1Id, "0,0", new Card("card1", 5, "Test Card"));


        Map<Integer, ScoreCalculator.ColumnScore> columnScores = 
            ScoreCalculator.calculateColumnScores(gameModel);
        
        // Column 0: Player1 should win with 5 points
        ScoreCalculator.ColumnScore col0 = columnScores.get(0);
        assertEquals(5, col0.playerScores.get(player1Id));
        assertEquals(0, col0.playerScores.getOrDefault(player2Id, 0));
        assertEquals(player1Id, col0.winnerId);
        assertFalse(col0.isTie);
        
        // Columns 1 and 2 should be ties with 0 points each
        for (int i = 1; i < 3; i++) {
            ScoreCalculator.ColumnScore colScore = columnScores.get(i);
            assertEquals(0, colScore.playerScores.getOrDefault(player1Id, 0));
            assertEquals(0, colScore.playerScores.getOrDefault(player2Id, 0));
            assertNull(colScore.winnerId);
            assertTrue(colScore.isTie);
        }
    }

    @Test
    @DisplayName("Test multiple cards in same column are summed correctly")
    void testMultipleCardsInColumn() {
        // Player1 cards in column 1
        placeCard(player1Id, "1,0", new Card("card1", 3, "Card 1"));
        placeCard(player1Id, "1,1", new Card("card2", 4, "Card 2"));

        // Player2 cards in column 1
        placeCard(player2Id, "1,2", new Card("card3", 5, "Card 3"));
        placeCard(player2Id, "1,3", new Card("card4", 2, "Card 4"));


        Map<Integer, ScoreCalculator.ColumnScore> columnScores = 
            ScoreCalculator.calculateColumnScores(gameModel);
        
        // Column 1: Player1 has 3+4=7, Player2 has 5+2=7, should be a tie
        ScoreCalculator.ColumnScore col1 = columnScores.get(1);
        assertEquals(7, col1.playerScores.get(player1Id));
        assertEquals(7, col1.playerScores.get(player2Id));
        assertNull(col1.winnerId);
        assertTrue(col1.isTie);
    }

    @Test
    @DisplayName("Test player wins with 2 out of 3 columns")
    void testPlayerWinsWith2Columns() {
        // Column 0: Player1 wins (5 vs 3)
        placeCard(player1Id, "0,0", new Card("card1", 5, "Card 1"));
        placeCard(player2Id, "0,1", new Card("card2", 3, "Card 2"));
        
        // Column 1: Player2 wins (2 vs 6)
        placeCard(player1Id, "1,0", new Card("card3", 2, "Card 3"));
        placeCard(player2Id, "1,1", new Card("card4", 6, "Card 4"));
        
        // Column 2: Player1 wins (8 vs 7)
        placeCard(player1Id, "2,0", new Card("card5", 8, "Card 5"));
        placeCard(player2Id, "2,1", new Card("card6", 7, "Card 6"));
        
        // Calculate column scores
        Map<Integer, ScoreCalculator.ColumnScore> columnScores = 
            ScoreCalculator.calculateColumnScores(gameModel);
        
        // Verify column winners
        assertEquals(player1Id, columnScores.get(0).winnerId);
        assertEquals(player2Id, columnScores.get(1).winnerId);
        assertEquals(player1Id, columnScores.get(2).winnerId);
        
        // Determine overall winner
        String winner = ScoreCalculator.determineWinner(gameModel);
        assertEquals(player1Id, winner);
        
        // Check that scores were updated (columns won)
        assertNotNull(gameModel.getPlayerScores());
        assertEquals(2, gameModel.getPlayerScores().get(player1Id));
        assertEquals(1, gameModel.getPlayerScores().get(player2Id));
    }

    @Test
    @DisplayName("Test game ends in tie when players win equal columns")
    void testGameTieWithEqualColumns() {
        // Column 0: Player1 wins
        placeCard(player1Id, "0,0", new Card("card1", 5, "Card 1"));
        
        // Column 1: Player2 wins
        placeCard(player2Id, "1,0", new Card("card2", 5, "Card 2"));
        
        // Column 2: Tie (both have 0)
        // No cards placed
        
        String winner = ScoreCalculator.determineWinner(gameModel);
        assertNull(winner); // null indicates tie
        
        // Both players should have 1 column won
        assertEquals(1, gameModel.getPlayerScores().get(player1Id));
        assertEquals(1, gameModel.getPlayerScores().get(player2Id));
    }

    @Test
    @DisplayName("Test final column scores are stored when game completes")
    void testFinalColumnScoresStored() {
        // Setup a simple game state
        placeCard(player1Id, "0,0", new Card("card1", 5, "Card 1"));
        placeCard(player2Id, "1,0", new Card("card2", 3, "Card 2"));
        
        // Simulate game completion
        Map<Integer, ScoreCalculator.ColumnScore> columnScores = 
            ScoreCalculator.calculateColumnScores(gameModel);
        
        // Convert to the format stored in GameModel
        Map<Integer, Map<String, Integer>> finalColumnScores = new HashMap<>();
        for (Map.Entry<Integer, ScoreCalculator.ColumnScore> entry : columnScores.entrySet()) {
            finalColumnScores.put(entry.getKey(), entry.getValue().playerScores);
        }
        
        gameModel.setFinalColumnScores(finalColumnScores);
        gameModel.setGameState(GameState.COMPLETED);
        
        // Verify stored scores
        assertNotNull(gameModel.getFinalColumnScores());
        assertEquals(3, gameModel.getFinalColumnScores().size());
        
        // Column 0: Player1 has 5, Player2 has 0
        Map<String, Integer> col0Scores = gameModel.getFinalColumnScores().get(0);
        assertEquals(5, col0Scores.get(player1Id));
        assertEquals(0, col0Scores.getOrDefault(player2Id, 0));
        
        // Column 1: Player1 has 0, Player2 has 3
        Map<String, Integer> col1Scores = gameModel.getFinalColumnScores().get(1);
        assertEquals(0, col1Scores.getOrDefault(player1Id, 0));
        assertEquals(3, col1Scores.get(player2Id));
    }

    @Test
    @DisplayName("Test column with all same power results in tie")
    void testColumnTieWithSamePower() {
        // Both players have total power 10 in column 0
        placeCard(player1Id, "0,0", new Card("card1", 4, "Card 1"));
        placeCard(player1Id, "0,1", new Card("card2", 6, "Card 2"));
        placeCard(player2Id, "0,2", new Card("card3", 7, "Card 3"));
        placeCard(player2Id, "0,3", new Card("card4", 3, "Card 4"));
        
        Map<Integer, ScoreCalculator.ColumnScore> columnScores = 
            ScoreCalculator.calculateColumnScores(gameModel);
        
        ScoreCalculator.ColumnScore col0 = columnScores.get(0);
        assertEquals(10, col0.playerScores.get(player1Id));
        assertEquals(10, col0.playerScores.get(player2Id));
        assertNull(col0.winnerId);
        assertTrue(col0.isTie);
    }

    @Test
    @DisplayName("Test all columns tied results in game tie")
    void testAllColumnsTied() {
        // All three columns have ties
        for (int col = 0; col < 3; col++) {
            Card card1 = new Card("card" + (col*2), 5, "Card " + (col*2));
            Card card2 = new Card("card" + (col*2+1), 5, "Card " + (col*2+1));
            placeCard(player1Id, col + ",0", card1);
            placeCard(player2Id, col + ",1", card2);
        }
        
        String winner = ScoreCalculator.determineWinner(gameModel);
        assertNull(winner); // Game is a tie
        
        // Both players should have 0 columns won (all tied)
        assertEquals(0, gameModel.getPlayerScores().get(player1Id));
        assertEquals(0, gameModel.getPlayerScores().get(player2Id));
    }

    @Test
    @DisplayName("Test complex board state with mixed columns")
    void testComplexBoardState() {
        // Column 0: Heavy battle, Player1 wins 15 vs 14
        placeCard(player1Id, "0,0", new Card("c1", 7, "Card 1"));
        placeCard(player1Id, "0,1", new Card("c2", 8, "Card 2"));
        placeCard(player2Id, "0,2", new Card("c3", 9, "Card 3"));
        placeCard(player2Id, "0,3", new Card("c4", 5, "Card 4"));
        
        // Column 1: Empty
        
        // Column 2: Single card from Player2
        placeCard(player2Id, "2,0", new Card("c5", 3, "Card 5"));
        
        Map<Integer, ScoreCalculator.ColumnScore> columnScores = 
            ScoreCalculator.calculateColumnScores(gameModel);
        
        // Verify results
        assertEquals(player1Id, columnScores.get(0).winnerId);
        assertNull(columnScores.get(1).winnerId); // Empty column is a tie
        assertEquals(player2Id, columnScores.get(2).winnerId);
        
        // Game should be tied (1-1 columns, with 1 empty)
        String winner = ScoreCalculator.determineWinner(gameModel);
        assertNull(winner);
    }

    // Helper method to place a card on the board
    private void placeCard(String playerId, String position, Card card) {
        gameModel.playCard(playerId, Position.fromStorageString(position), card);
    }
}