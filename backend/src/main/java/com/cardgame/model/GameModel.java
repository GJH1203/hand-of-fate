package com.cardgame.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "games")
public class GameModel {

    @Id // Marks the primary key for this document's ID
    private String id;

    private GameState gameState;

    private Board board;

    private Instant createdAt;

    private Instant updatedAt;

    private String currentPlayerId;

    private List<String> playerIds;

    /**
     * Everything about a game that used to live on the players in it, keyed by player id.
     *
     * <p>Hands, placed cards and the deck were fields on {@code Player}, so a player could
     * only be in one game at a time, a move wrote three documents, and a game that ended
     * any way other than cleanly left the player holding a hand from it. Here a move is
     * one read and one write of one document, and a crash loses nothing that was saved.
     *
     * <p>Keyed by player id rather than by seat, which means the same player cannot hold
     * both sides of a game — see the guard in {@code NakamaMatchService.joinMatch}.
     */
    @Field("hands")
    private Map<String, List<Card>> hands = new HashMap<>();

    @Field("placed_cards")
    private Map<String, Map<String, Card>> placedCards = new HashMap<>();

    /**
     * Denormalised at creation so that showing a game does not have to read its players.
     * A rename after the fact will not reach a game already in progress, which is the
     * trade being made: a name in a finished game is a record of what it was called then.
     */
    @Field("player_names")
    private Map<String, String> playerNames = new HashMap<>();

    // Game result fields
    private String winnerId;
    private boolean isTie;
    private Map<String, Integer> playerScores;
    private Map<Integer, Map<String, Integer>> finalColumnScores; // Stores column scores at game end

    // Win request fields
    private boolean hasPendingWinRequest;
    private String pendingWinRequestPlayerId;
    
    // Online mode fields
    private GameMode gameMode = GameMode.LOCAL;
    private String nakamaMatchId;
    private Map<String, ConnectionStatus> playerConnections;
    private Instant lastSyncTime;

    // constructor, getters, and setters
    public GameModel() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.playerScores = new HashMap<>();
        this.hasPendingWinRequest = false;
    }

    public GameModel(String id, GameState gameState, Board board) {
        this.id = id;
        this.gameState = gameState;
        this.board = board;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.playerScores = new HashMap<>();
        this.hasPendingWinRequest = false;
    }

    // Win request getters and setters
    public boolean hasPendingWinRequest() {
        return hasPendingWinRequest;
    }

    public void setHasPendingWinRequest(boolean hasPendingWinRequest) {
        this.hasPendingWinRequest = hasPendingWinRequest;
    }

    public String getPendingWinRequestPlayerId() {
        return pendingWinRequestPlayerId;
    }

    public void setPendingWinRequestPlayerId(String pendingWinRequestPlayerId) {
        this.pendingWinRequestPlayerId = pendingWinRequestPlayerId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public GameState getGameState() {
        return gameState;
    }

    public void setGameState(GameState gameState) {
        this.gameState = gameState;
    }

    public Board getBoard() {
        return board;
    }

    public void setBoard(Board board) {
        this.board = board;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCurrentPlayerId() {
        return currentPlayerId;
    }

    public void setCurrentPlayerId(String currentPlayerId) {
        this.currentPlayerId = currentPlayerId;
    }

    public List<String> getPlayerIds() {
        return playerIds;
    }

    public void setPlayerIds(List<String> playerIds) {
        this.playerIds = playerIds;
    }

    public Map<String, List<Card>> getHands() {
        return hands;
    }

    public void setHands(Map<String, List<Card>> hands) {
        this.hands = hands;
    }

    public Map<String, Map<String, Card>> getPlacedCards() {
        return placedCards;
    }

    public void setPlacedCards(Map<String, Map<String, Card>> placedCards) {
        this.placedCards = placedCards;
    }

    public Map<String, String> getPlayerNames() {
        return playerNames;
    }

    public void setPlayerNames(Map<String, String> playerNames) {
        this.playerNames = playerNames;
    }

    /**
     * The player's hand, empty if they are not in this game.
     *
     * <p>Reading is the common path — a view of the game is built for every connected
     * session on every move — so it must not create anything. Somebody looking at a game
     * they are not playing should not quietly become a participant with no cards.
     */
    public List<Card> handOf(String playerId) {
        List<Card> hand = hands == null ? null : hands.get(playerId);
        return hand == null ? List.of() : hand;
    }

    /** The player's cards on the board, by position key. Empty if they have none. */
    public Map<String, Card> placedCardsOf(String playerId) {
        Map<String, Card> placed = placedCards == null ? null : placedCards.get(playerId);
        return placed == null ? Map.of() : placed;
    }

    public String playerNameOf(String playerId) {
        return playerNames == null ? null : playerNames.get(playerId);
    }

    /** Gives a player their opening hand, and records the name to show them under. */
    public void seatPlayer(String playerId, String playerName, List<Card> hand) {
        if (hands == null) {
            hands = new HashMap<>();
        }
        if (playerNames == null) {
            playerNames = new HashMap<>();
        }
        hands.put(playerId, new ArrayList<>(hand));
        playerNames.put(playerId, playerName);
    }

    /**
     * Moves a card out of a player's hand and onto the board.
     *
     * <p>The whole of a move, on one document. The board rejects a position that is
     * occupied or off the edge; whether the player is allowed to place <em>there</em> is
     * the validator's business, and has already been settled by the time this runs.
     */
    public void playCard(String playerId, Position position, Card card) {
        if (hands == null) {
            hands = new HashMap<>();
        }
        if (placedCards == null) {
            placedCards = new HashMap<>();
        }
        board.placeCard(position, card.getId());
        hands.computeIfAbsent(playerId, id -> new ArrayList<>()).remove(card);
        placedCards.computeIfAbsent(playerId, id -> new HashMap<>())
                .put(position.toStorageString(), card);
    }

    public String getWinnerId() {
        return winnerId;
    }

    public void setWinnerId(String winnerId) {
        this.winnerId = winnerId;
    }

    public boolean isTie() {
        return isTie;
    }

    public void setTie(boolean tie) {
        isTie = tie;
    }

    public Map<String, Integer> getPlayerScores() {
        return playerScores;
    }

    public void setPlayerScores(Map<String, Integer> playerScores) {
        this.playerScores = playerScores;
    }

    /**
     * Add or update a player's score in the scores map.
     *
     * @param playerId The ID of the player
     * @param score The player's score
     */
    public void updatePlayerScore(String playerId, int score) {
        if (this.playerScores == null) {
            this.playerScores = new HashMap<>();
        }
        this.playerScores.put(playerId, score);
    }

    public Map<Integer, Map<String, Integer>> getFinalColumnScores() {
        return finalColumnScores;
    }

    public void setFinalColumnScores(Map<Integer, Map<String, Integer>> finalColumnScores) {
        this.finalColumnScores = finalColumnScores;
    }

    @Override
    public String toString() {
        return "Game{" +
                "id='" + id + '\'' +
                ", gameState=" + gameState +
                ", board=" + board +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ", currentPlayerId='" + currentPlayerId + '\'' +
                ", playerIds=" + playerIds +
                ", winnerId='" + winnerId + '\'' +
                ", isTie=" + isTie +
                ", playerScores=" + playerScores +
                ", hasPendingWinRequest=" + hasPendingWinRequest +
                ", pendingWinRequestPlayerId='" + pendingWinRequestPlayerId + '\'' +
                '}';
    }

    public void updateGame(GameState gameState, Board board) {
        this.gameState = gameState;
        this.board = board;
        this.updatedAt = Instant.now();
    }

    /**
     * Get the scores map for all players in this game.
     * @return Map of player IDs to their current scores
     */
    public Map<String, Integer> getScores() {
        // Ensure scores map is never null
        if (playerScores == null) {
            playerScores = new HashMap<>();
        }
        return playerScores;
    }

    public void setScores(Map<String, Integer> scores) {
        this.playerScores = scores;
    }
    
    // Online mode getters and setters
    public GameMode getGameMode() {
        return gameMode;
    }
    
    public void setGameMode(GameMode gameMode) {
        this.gameMode = gameMode;
    }
    
    public String getNakamaMatchId() {
        return nakamaMatchId;
    }
    
    public void setNakamaMatchId(String nakamaMatchId) {
        this.nakamaMatchId = nakamaMatchId;
    }
    
    public Map<String, ConnectionStatus> getPlayerConnections() {
        return playerConnections;
    }
    
    public void setPlayerConnections(Map<String, ConnectionStatus> playerConnections) {
        this.playerConnections = playerConnections;
    }
    
    public Instant getLastSyncTime() {
        return lastSyncTime;
    }
    
    public void setLastSyncTime(Instant lastSyncTime) {
        this.lastSyncTime = lastSyncTime;
    }
}
