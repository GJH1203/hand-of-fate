package com.cardgame.service;

import com.cardgame.dto.*;
import com.cardgame.exception.game.GameNotFoundException;
import com.cardgame.exception.game.InvalidMoveException;
import com.cardgame.model.Board;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.repository.GameRepository;
import com.cardgame.service.factory.MoveStrategyFactory;
import com.cardgame.service.manager.BoardManager;
import com.cardgame.service.nakama.NakamaLeaderBoardService;
import com.cardgame.service.player.DeckService;
import com.cardgame.service.player.PlayerService;
import com.cardgame.service.util.ScoreCalculator;
import com.cardgame.service.validator.GameValidator;
import org.checkerframework.checker.units.qual.C;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GameService {
    private static final Logger logger = LoggerFactory.getLogger(GameService.class);
    
    private final GameRepository gameRepository;
    private final PlayerService playerService;
    private final CardService cardService;
    private final DeckService deckService;
    private final BoardManager boardManager;
    private final GameValidator gameValidator;
    private final MoveStrategyFactory moveStrategyFactory;
    private final NakamaLeaderBoardService nakamaLeaderBoardService;

    public GameService(GameRepository gameRepository,
                       PlayerService playerService,
                       CardService cardService,
                       DeckService deckService,
                       BoardManager boardManager,
                       GameValidator gameValidator,
                       MoveStrategyFactory moveStrategyFactory, NakamaLeaderBoardService nakamaLeaderBoardService) {
        this.gameRepository = gameRepository;
        this.playerService = playerService;
        this.cardService = cardService;
        this.deckService = deckService;
        this.boardManager = boardManager;
        this.gameValidator = gameValidator;
        this.moveStrategyFactory = moveStrategyFactory;
        this.nakamaLeaderBoardService = nakamaLeaderBoardService;
    }

    public GameDto convertToDto(GameModel gameModel) {
        return convertToDto(gameModel, gameModel.getCurrentPlayerId());
    }
    
    public GameDto convertToDto(GameModel gameModel, String forPlayerId) {
        Player currentPlayer = playerService.getPlayer(forPlayerId);

        // Build card ownership map and collect all placed cards
        Map<String, String> cardOwnership = new HashMap<>();
        Map<String, CardDto> placedCards = new HashMap<>();
        for (String playerId : gameModel.getPlayerIds()) {
            Player player = playerService.getPlayer(playerId);
            if (player.getPlacedCards() != null) {
                for (Map.Entry<String, Card> entry : player.getPlacedCards().entrySet()) {
                    String position = entry.getKey();
                    Card card = entry.getValue();
                    cardOwnership.put(position, playerId);
                    placedCards.put(card.getId(), convertCardToDto(card));
                }
            }
        }

        // Create the builder first
        ImmutableGameDto.Builder builder = ImmutableGameDto.builder()
                .id(gameModel.getId())
                .state(gameModel.getGameState())
                .board(ImmutableBoardDto.builder()
                        .width(gameModel.getBoard().getWidth())
                        .height(gameModel.getBoard().getHeight())
                        .pieces(gameModel.getBoard().getPieces())  // Use string keys directly
                        .build())
                .currentPlayerId(gameModel.getCurrentPlayerId())
                .currentPlayerHand(currentPlayer.getHand().stream()
                        .map(this::convertCardToDto)
                        .collect(Collectors.toList()))
                .playerIds(gameModel.getPlayerIds())
                .cardOwnership(cardOwnership)
                .placedCards(placedCards)
                .createdAt(gameModel.getCreatedAt())
                .updatedAt(gameModel.getUpdatedAt());

        // Calculate and add column scores
        Map<Integer, ScoreCalculator.ColumnScore> columnScores = ScoreCalculator.calculateColumnScores(gameModel, playerService);
        Map<Integer, ColumnScoreDto> columnScoreDtos = new HashMap<>();
        for (Map.Entry<Integer, ScoreCalculator.ColumnScore> entry : columnScores.entrySet()) {
            ScoreCalculator.ColumnScore colScore = entry.getValue();
            ColumnScoreDto dto = ImmutableColumnScoreDto.builder()
                    .playerScores(colScore.playerScores)
                    .winnerId(colScore.winnerId)
                    .isTie(colScore.isTie)
                    .build();
            columnScoreDtos.put(entry.getKey(), dto);
        }
        builder.columnScores(columnScoreDtos);
        
        // Debug logging
        logger.debug("Column scores for game {} viewed by player {}: {}", 
            gameModel.getId(), forPlayerId, columnScoreDtos);

        // Add win request information if there's a pending request
        if (gameModel.hasPendingWinRequest()) {
            builder.hasPendingWinRequest(true);
            // Only set the pendingWinRequestPlayerId if it's not null
            if (gameModel.getPendingWinRequestPlayerId() != null) {
                builder.pendingWinRequestPlayerId(gameModel.getPendingWinRequestPlayerId());
            }
        }

        // If the game is completed, include the scores and winner information
        if (gameModel.getGameState() == GameState.COMPLETED) {
            builder.scores(gameModel.getPlayerScores());
            // Only set the winnerId if it's not null
            if (gameModel.getWinnerId() != null) {
                builder.winnerId(gameModel.getWinnerId());
            }
            builder.isTie(gameModel.isTie());
        }

        return builder.build();
    }

    private CardDto convertCardToDto(Card card) {
        ImmutableCardDto.Builder builder = ImmutableCardDto.builder()
                .id(card.getId())
                .power(card.getPower())
                .name(card.getName());
        
        if (card.getImageUrl() != null) {
            builder.imageUrl(card.getImageUrl());
        }
        
        return builder.build();
    }


    /**
     * Initialize a new game
     */
    public GameDto initializeGame(String player1Id, String player2Id, String deck1Id, String deck2Id) {

//        validatePlayersAndDecks(player1Id, player2Id, deck1Id, deck2Id);
        gameValidator.validatePlayerAndDecks(player1Id, player2Id, deck1Id, deck2Id);

        // create a new game model
        GameModel gameModel = new GameModel();
        gameModel.setId(UUID.randomUUID().toString());
        gameModel.setGameState(GameState.INITIALIZED);

        // initialize the board (3*5)
        gameModel.setBoard(new Board());

        // set up players
        List<String> playerIds = Arrays.asList(player1Id, player2Id);
        gameModel.setPlayerIds(playerIds);
        gameModel.setCurrentPlayerId(player1Id); // player1 starts first

        // set up players' game state with their chosen decks
        setupPlayerGameState(player1Id, deck1Id);
        setupPlayerGameState(player2Id, deck2Id);

        placeInitialCards(gameModel, player1Id, player2Id);

        gameModel.setGameState(GameState.IN_PROGRESS);
        gameRepository.save(gameModel);

        return convertToDto(gameModel);
    }

    private void setupPlayerGameState(String playerId, String deckId) {
        Player player = playerService.getPlayer(playerId);
        Deck originalDeck = deckService.getDeck(deckId);

        // Store reference to original deck for restoration after game
        player.setOriginalDeck(originalDeck);

        // Create a temporary copy of the deck for this game (in memory only - don't save to DB)
        Deck gameDeck = new Deck();
        gameDeck.setId(UUID.randomUUID().toString());
        gameDeck.setOwnerId(playerId);
        gameDeck.setCards(new ArrayList<>(originalDeck.getCards())); // Copy cards from original deck
        gameDeck.setRemainingCards(originalDeck.getCards().size());

        // Note: NOT saving gameDeck to database - it's temporary for this game only

        // Draw initial hand (5 cards)
        List<Card> initialHand = new ArrayList<>(gameDeck.getCards().subList(0, 5));
        gameDeck.getCards().subList(0, 5).clear();
        gameDeck.setRemainingCards(gameDeck.getCards().size());

        // Update player's game state with temporary deck
        player.setCurrentDeck(gameDeck);
        player.setHand(initialHand);
        player.setScore(0);
        player.setPlacedCards(new HashMap<>());

        // Save updated player state (includes originalDeck reference)
        playerService.savePlayer(player);
    }

    private void placeInitialCards(GameModel gameModel, String player1Id, String player2Id) {
        Board board = gameModel.getBoard();

        placeInitialCardForPlayer(player1Id, new Position(1, 3), board);
        placeInitialCardForPlayer(player2Id, new Position(1, 1), board);
    }

    private void placeInitialCardForPlayer(String playerId, Position position, Board board) {
        Player player = playerService.getPlayer(playerId);
        // Randomly select a card from the player's hand
        int randomIndex = (int) (Math.random() * player.getHand().size());
        Card card = player.getHand().remove(randomIndex);
        boardManager.placeCard(board, position, card.getId());
        player.getPlacedCards().put(position.toStorageString(), card);
        playerService.savePlayer(player);
    }

    /**
     * Process a player's move
     */
    public GameDto processMove(String gameId, PlayerAction action) {
        GameModel gameModel = gameRepository.findById(gameId)
                .orElseThrow(() -> new GameNotFoundException("Game not found: " + gameId));

        // Special handling for win request response
        if (action.getType() == PlayerAction.ActionType.RESPOND_TO_WIN_REQUEST) {
            return handleWinRequestResponse(gameModel, action);
        }

        // For other actions, validate it's the player's turn
        gameValidator.validatePlayerTurn(gameModel, action.getPlayerId());
        
        // Validate the move itself (e.g., card placement rules)
        if (action.getType() == PlayerAction.ActionType.PLACE_CARD) {
            gameValidator.validateMove(gameModel, action);
        }

        // Use strategy pattern to execute the move
        var strategy = moveStrategyFactory.createStrategy(action.getType());
        strategy.executeMove(gameModel, action);

        // Special post-processing for win request
        if (action.getType() == PlayerAction.ActionType.REQUEST_WIN_CALCULATION) {
            // For win requests, we switch to the next player and return
            switchToNextPlayer(gameModel);
            gameModel.setUpdatedAt(Instant.now());
            gameModel = gameRepository.save(gameModel);
            return convertToDto(gameModel);
        }

        // Check if game is over (for regular moves)
        if (isGameOver(gameModel)) {
            finalizeGame(gameModel);
        } else {
            handleTurnSwitching(gameModel);
        }

        // Update timestamp
        gameModel.setUpdatedAt(Instant.now());

        // Save and return updated game state
        gameModel = gameRepository.save(gameModel);

        return convertToDto(gameModel);
    }

    private GameDto handleWinRequestResponse(GameModel gameModel, PlayerAction action) {
        String respondingPlayerId = action.getPlayerId();

        // Validate that there's a pending win request
        if (!gameModel.hasPendingWinRequest()) {
            throw new InvalidMoveException("There is no pending win request to respond to");
        }

        // Validate it's this player's turn
        gameValidator.validatePlayerTurn(gameModel, respondingPlayerId);

        // Use strategy to handle the response
        var strategy = moveStrategyFactory.createStrategy(action.getType());
        strategy.executeMove(gameModel, action);

        // Extract acceptance from action data
        Boolean accepted = false;
        if (action.getActionData() instanceof Boolean) {
            accepted = (Boolean) action.getActionData();
        } else {
            throw new InvalidMoveException("Response action must include a boolean acceptance value");
        }

        if (accepted) {
            // If request is accepted, finalize the game
            finalizeGame(gameModel);
        }

        // Update timestamp
        gameModel.setUpdatedAt(Instant.now());

        // Save and return updated game state
        gameModel = gameRepository.save(gameModel);

        return convertToDto(gameModel);
    }

    private boolean isGameOver(GameModel gameModel) {
        if (boardManager.isFull(gameModel.getBoard())) {
            return true;
        }

        // Check if both players have no valid moves
        return !anyPlayerHasValidMoves(gameModel);
    }

    private boolean anyPlayerHasValidMoves(GameModel gameModel) {
        for (String playerId : gameModel.getPlayerIds()) {
            Player player = playerService.getPlayer(playerId);
            if (!player.getHand().isEmpty() && hasValidMoves(gameModel, player)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasValidMoves(GameModel gameModel, Player player) {
        List<Position> emptyPositions = gameModel.getBoard().getEmptyPositions();

        for (Position pos : emptyPositions) {
            if (!player.getHand().isEmpty()) {
                PlayerAction testAction = ImmutablePlayerAction.builder()
                        .type(PlayerAction.ActionType.PLACE_CARD)
                        .playerId(player.getId())
                        .targetPosition(pos)
                        .card(player.getHand().get(0))
                        .timestamp(System.currentTimeMillis())
                        .build();

                try {
                    gameValidator.validateMove(gameModel, testAction);
                    return true;
                } catch (Exception e) {
                    // Continue checking other positions
                }
            }
        }
        return false;
    }

    /**
     * Finalizes a game when it's over, calculating scores and determining the winner.
     *
     * @param gameModel The game model to finalize
     */
    private void finalizeGame(GameModel gameModel) {
        // Set game state to completed
        gameModel.setGameState(GameState.COMPLETED);

        // Get all players for this game
        Map<String, Player> players = new HashMap<>();
        for (String playerId : gameModel.getPlayerIds()) {
            Player player = playerService.getPlayer(playerId);
            players.put(playerId, player);

            // Calculate and update player scores for this game
            ScoreCalculator.updatePlayerScore(player, gameModel);

            // Add the current game score to lifetime score
            int gameScore = player.getScore();
            player.addLifetimeScore(gameScore);

            // Store scores in the game model
            gameModel.updatePlayerScore(playerId, gameScore);

            // Restore player's original deck and clean up temporary game state
            restorePlayerOriginalState(player);

            // Save player with updated lifetime score and restored original deck
            playerService.savePlayer(player);

            // Submit lifetime score to leaderboard if player has a Nakama user ID
            if (player.getNakamaUserId() != null && !player.getNakamaUserId().isEmpty()) {
                nakamaLeaderBoardService.submitPlayerScore(player.getNakamaUserId(), player.getLifetimeScore(), 
                    player.getName());
            }
        }

        // Determine winner using column-based scoring
        String winnerId = ScoreCalculator.determineWinner(gameModel, playerService);
        gameModel.setWinnerId(winnerId);
        gameModel.setTie(winnerId == null);

        // Award bonus points to the winner's lifetime score
        if (winnerId != null && !gameModel.isTie()) {
            Player winner = players.get(winnerId);
            if (winner != null) {
                // Add a victory bonus to lifetime score (e.g., 10 points)
                int victoryBonus = 10;
                winner.addLifetimeScore(victoryBonus);
                playerService.savePlayer(winner);

                // Update leaderboard with the new lifetime score including victory bonus
                if (winner.getNakamaUserId() != null && !winner.getNakamaUserId().isEmpty()) {
                    nakamaLeaderBoardService.submitPlayerScore(winner.getNakamaUserId(), winner.getLifetimeScore(), 
                        winner.getName());
                }
            }
        }
    }

    private void handleTurnSwitching(GameModel gameModel) {
        String currentPlayerId = gameModel.getCurrentPlayerId();
        Player currentPlayer = playerService.getPlayer(currentPlayerId);
        
        // Try to switch to next player first
        switchToNextPlayer(gameModel);
        String nextPlayerId = gameModel.getCurrentPlayerId();
        Player nextPlayer = playerService.getPlayer(nextPlayerId);
        
        // If next player has no valid moves, check if current player can continue
        if (nextPlayer.getHand().isEmpty() || !hasValidMoves(gameModel, nextPlayer)) {
            // Switch back to current player if they still have valid moves
            if (!currentPlayer.getHand().isEmpty() && hasValidMoves(gameModel, currentPlayer)) {
                gameModel.setCurrentPlayerId(currentPlayerId);
            }
            // If both players have no valid moves, the game will end on next check
        }
    }

    /**
     * Restore player's original deck and clean up temporary game state
     */
    private void restorePlayerOriginalState(Player player) {
        // Restore original deck reference
        if (player.getOriginalDeck() != null) {
            player.setCurrentDeck(player.getOriginalDeck());
            player.setOriginalDeck(null); // Clear temporary reference
        }

        // Clean up temporary game state
        player.setHand(new ArrayList<>()); // Clear hand
        player.setPlacedCards(new HashMap<>()); // Clear placed cards
        player.setScore(0); // Reset game score (lifetime score already updated)
    }

    private void switchToNextPlayer(GameModel gameModel) {
        List<String> playerIds = gameModel.getPlayerIds();
        int currentIndex = playerIds.indexOf(gameModel.getCurrentPlayerId());
        int nextIndex = (currentIndex + 1) % playerIds.size();
        gameModel.setCurrentPlayerId(playerIds.get(nextIndex));
    }

    public GameDto getGame(String gameId) {
        return convertToDto(gameRepository.findById(gameId)
                .orElseThrow(() -> new GameNotFoundException("Game not found: " + gameId)));
    }
    
    public GameModel getGameModel(String gameId) {
        return gameRepository.findById(gameId)
                .orElseThrow(() -> new GameNotFoundException("Game not found: " + gameId));
    }

    /**
     * Get the formatted game results for a completed game
     *
     * @param gameId The ID of the game
     * @return A formatted string with the game results, or a message if the game is not completed
     */
//    public String getGameResults(String gameId) {
//        GameModel gameModel = gameRepository.findById(gameId)
//                .orElseThrow(() -> new GameNotFoundException("Game not found: " + gameId));
//
//        if (gameModel.getGameState() != GameState.COMPLETED) {
//            return "Game is not yet completed.";
//        }
//
//        return ScoreCalculator.formatGameResults(gameModel.getPlayerScores(), gameModel.getWinnerId());
//    }

}
