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
import com.cardgame.config.MetricsConfig;
import io.micrometer.core.instrument.Counter;
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

    /** Added to the winner's lifetime score when a game ends decisively. */
    private static final int VICTORY_BONUS = 10;

    private final GameRepository gameRepository;
    private final PlayerService playerService;
    private final CardService cardService;
    private final DeckService deckService;
    private final BoardManager boardManager;
    private final GameValidator gameValidator;
    private final MoveStrategyFactory moveStrategyFactory;
    private final NakamaLeaderBoardService nakamaLeaderBoardService;
    private final MetricsConfig metricsConfig;
    private final Counter gameCreatedCounter;
    private final Counter gameCompletedCounter;

    public GameService(GameRepository gameRepository,
                       PlayerService playerService,
                       CardService cardService,
                       DeckService deckService,
                       BoardManager boardManager,
                       GameValidator gameValidator,
                       MoveStrategyFactory moveStrategyFactory,
                       NakamaLeaderBoardService nakamaLeaderBoardService,
                       MetricsConfig metricsConfig,
                       Counter gameCreatedCounter,
                       Counter gameCompletedCounter) {
        this.gameRepository = gameRepository;
        this.playerService = playerService;
        this.cardService = cardService;
        this.deckService = deckService;
        this.boardManager = boardManager;
        this.gameValidator = gameValidator;
        this.moveStrategyFactory = moveStrategyFactory;
        this.nakamaLeaderBoardService = nakamaLeaderBoardService;
        this.metricsConfig = metricsConfig;
        this.gameCreatedCounter = gameCreatedCounter;
        this.gameCompletedCounter = gameCompletedCounter;
    }

    public GameDto convertToDto(GameModel gameModel) {
        return convertToDto(gameModel, gameModel.getCurrentPlayerId());
    }

    /**
     * Builds the view of a game for one player, from the game alone.
     *
     * <p>This used to read every player in the game, because the hands, the placed cards
     * and the names were on them. It reads nothing now, which matters because a move is
     * broadcast to every connected session and each session needs its own view: the cost
     * of a broadcast no longer rises with the number of people watching.
     */
    public GameDto convertToDto(GameModel gameModel, String forPlayerId) {
        // Build card ownership map and collect all placed cards
        Map<String, String> cardOwnership = new HashMap<>();
        Map<String, CardDto> placedCards = new HashMap<>();
        for (String playerId : gameModel.getPlayerIds()) {
            for (Map.Entry<String, Card> entry : gameModel.placedCardsOf(playerId).entrySet()) {
                String position = entry.getKey();
                Card card = entry.getValue();
                cardOwnership.put(position, playerId);
                placedCards.put(card.getId(), convertCardToDto(card));
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
                .currentPlayerHand(gameModel.handOf(forPlayerId).stream()
                        .map(this::convertCardToDto)
                        .collect(Collectors.toList()))
                .playerIds(gameModel.getPlayerIds())
                .cardOwnership(cardOwnership)
                .placedCards(placedCards)
                .playerNames(gameModel.getPlayerNames())
                .createdAt(gameModel.getCreatedAt())
                .updatedAt(gameModel.getUpdatedAt());

        // Calculate and add column scores
        Map<Integer, ColumnScoreDto> columnScoreDtos = new HashMap<>();
        
        // If game is completed and we have stored final column scores, use those
        if (gameModel.getGameState() == GameState.COMPLETED && gameModel.getFinalColumnScores() != null) {
            Map<Integer, Map<String, Integer>> finalScores = gameModel.getFinalColumnScores();
            for (Map.Entry<Integer, Map<String, Integer>> entry : finalScores.entrySet()) {
                Integer columnIndex = entry.getKey();
                Map<String, Integer> scores = entry.getValue();
                
                // Reuse ScoreCalculator logic to determine column winner
                ScoreCalculator.ColumnScore tempColScore = new ScoreCalculator.ColumnScore();
                tempColScore.playerScores = scores;
                ScoreCalculator.determineColumnWinner(tempColScore);
                
                ColumnScoreDto dto = ImmutableColumnScoreDto.builder()
                        .playerScores(scores)
                        .winnerId(tempColScore.winnerId)
                        .isTie(tempColScore.isTie)
                        .build();
                columnScoreDtos.put(columnIndex, dto);
            }
        } else {
            // Game in progress - calculate current column scores
            Map<Integer, ScoreCalculator.ColumnScore> columnScores = ScoreCalculator.calculateColumnScores(gameModel);
            for (Map.Entry<Integer, ScoreCalculator.ColumnScore> entry : columnScores.entrySet()) {
                ScoreCalculator.ColumnScore colScore = entry.getValue();
                ColumnScoreDto dto = ImmutableColumnScoreDto.builder()
                        .playerScores(colScore.playerScores)
                        .winnerId(colScore.winnerId)
                        .isTie(colScore.isTie)
                        .build();
                columnScoreDtos.put(entry.getKey(), dto);
            }
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

        // Calculate column wins for current game state
        Map<String, Integer> columnsWonByPlayer = new HashMap<>();
        for (ColumnScoreDto columnScore : columnScoreDtos.values()) {
            if (columnScore.getWinnerId() != null && !columnScore.isTie()) {
                columnsWonByPlayer.merge(columnScore.getWinnerId(), 1, Integer::sum);
            }
        }
        
        // Initialize scores for all players with 0 if they haven't won any columns
        for (String playerId : gameModel.getPlayerIds()) {
            columnsWonByPlayer.putIfAbsent(playerId, 0);
        }
        
        // Always include scores (columns won count)
        builder.scores(columnsWonByPlayer);

        // If the game is completed, include winner information
        if (gameModel.getGameState() == GameState.COMPLETED) {
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

        // deal each player into the game itself, rather than onto their player document
        dealIntoGame(gameModel, player1Id, deck1Id);
        dealIntoGame(gameModel, player2Id, deck2Id);

        placeInitialCards(gameModel, player1Id, player2Id);

        gameModel.setGameState(GameState.IN_PROGRESS);
        gameRepository.save(gameModel);
        
        // Track metrics
        gameCreatedCounter.increment();
        metricsConfig.incrementActiveGames();
        logger.info("Game created with ID: {}", gameModel.getId());

        return convertToDto(gameModel);
    }

    /**
     * Deals a player their opening hand out of the deck they chose.
     *
     * <p>The deck is read and left alone. It used to be copied into a temporary deck that
     * was never saved and then written over the player's {@code currentDeck}, which is
     * why finishing a game had to put the real one back — and why a game that never
     * finished left the player pointing at a deck document that does not exist. The whole
     * arrangement bought nothing: a deck is five cards and a hand is five cards, so the
     * copy was empty from the moment it was made.
     */
    private void dealIntoGame(GameModel gameModel, String playerId, String deckId) {
        Player player = playerService.getPlayer(playerId);
        Deck deck = deckService.getDeck(deckId);

        gameModel.seatPlayer(playerId, player.getName(), new ArrayList<>(deck.getCards()));
    }

    private void placeInitialCards(GameModel gameModel, String player1Id, String player2Id) {
        placeInitialCardForPlayer(gameModel, player1Id, new Position(1, 3));
        placeInitialCardForPlayer(gameModel, player2Id, new Position(1, 1));
    }

    private void placeInitialCardForPlayer(GameModel gameModel, String playerId, Position position) {
        // Randomly select a card from the player's hand
        List<Card> hand = gameModel.handOf(playerId);
        Card card = hand.get((int) (Math.random() * hand.size()));
        gameModel.playCard(playerId, position, card);
    }

    /**
     * Process a player's move
     */
    public GameDto processMove(String gameId, PlayerAction action) {
        return convertToDto(applyMove(gameId, action));
    }

    /**
     * Applies a move and returns the saved game, without converting it.
     *
     * <p>Split out of {@link #processMove} for the WebSocket handler, which broadcasts a
     * separate view of the result to each session and so has no use for the one
     * conversion processMove would do — it used to throw that away and then re-read the
     * game it had just saved. Between them those were four database round trips per move
     * that nothing looked at.
     */
    public GameModel applyMove(String gameId, PlayerAction action) {
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
            return gameRepository.save(gameModel);
        }

        // Check if game is over (for regular moves)
        boolean completedByThisMove = isGameOver(gameModel);
        if (completedByThisMove) {
            finalizeGame(gameModel);
        } else {
            handleTurnSwitching(gameModel);
        }

        // Update timestamp
        gameModel.setUpdatedAt(Instant.now());

        // Save and return updated game state
        GameModel saved = gameRepository.save(gameModel);
        if (completedByThisMove) {
            recordGameCompleted(saved);
        }
        return saved;
    }

    private GameModel handleWinRequestResponse(GameModel gameModel, PlayerAction action) {
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
        GameModel saved = gameRepository.save(gameModel);
        if (accepted) {
            recordGameCompleted(saved);
        }
        return saved;
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
            if (hasValidMoves(gameModel, playerId)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasValidMoves(GameModel gameModel, String playerId) {
        List<Card> hand = gameModel.handOf(playerId);
        if (hand.isEmpty()) {
            return false;
        }

        for (Position pos : gameModel.getBoard().getEmptyPositions()) {
            PlayerAction testAction = ImmutablePlayerAction.builder()
                    .type(PlayerAction.ActionType.PLACE_CARD)
                    .playerId(playerId)
                    .targetPosition(pos)
                    .card(hand.get(0))
                    .timestamp(System.currentTimeMillis())
                    .build();

            try {
                gameValidator.validateMove(gameModel, testAction);
                return true;
            } catch (InvalidMoveException e) {
                // Continue checking other positions
            }
        }
        return false;
    }

    /**
     * Finalizes a game when it's over, calculating scores and determining the winner.
     *
     * <p>Changes the game and nothing else. Everything with an effect outside this
     * document waits for {@link #recordGameCompleted}, once the save has gone through.
     *
     * @param gameModel The game model to finalize
     */
    private void finalizeGame(GameModel gameModel) {
        // Set game state to completed
        gameModel.setGameState(GameState.COMPLETED);

        Map<Integer, ScoreCalculator.ColumnScore> columnScores = ScoreCalculator.calculateColumnScores(gameModel);

        // Store column scores in the game model for final display
        Map<Integer, Map<String, Integer>> finalColumnScores = new HashMap<>();
        for (Map.Entry<Integer, ScoreCalculator.ColumnScore> entry : columnScores.entrySet()) {
            finalColumnScores.put(entry.getKey(), entry.getValue().playerScores);
        }
        gameModel.setFinalColumnScores(finalColumnScores);

        // Determine winner using column-based scoring. This also records the columns each
        // player won on the game, which is what playerScores is for — it used to be
        // overwritten with zeroes immediately afterwards, by a loop reading a per-game
        // score on Player that nothing ever set.
        String winnerId = ScoreCalculator.determineWinner(gameModel);
        gameModel.setWinnerId(winnerId);
        gameModel.setTie(winnerId == null);
    }

    /**
     * Everything a completed game owes the world outside its own document, run once the
     * game has been saved. A finished game touches its players once each, for the one
     * thing that genuinely belongs to them and outlives the game.
     */
    private void recordGameCompleted(GameModel gameModel) {
        gameCompletedCounter.increment();
        metricsConfig.decrementActiveGames();
        logger.info("Game completed with ID: {}", gameModel.getId());

        settleLifetimeScores(gameModel, gameModel.getWinnerId());
    }

    /**
     * Adds the victory bonus to the winner, and puts every player on the leaderboard.
     *
     * <p>Only the winner's total changes. Every player used to be written as well, but
     * the amount added was the per-game score on {@code Player}, which was always zero:
     * the method meant to maintain it had been a no-op since scoring moved to columns.
     * Every player is still <em>submitted</em>, so that somebody who has yet to win a
     * game still appears on the leaderboard rather than being absent from it.
     */
    private void settleLifetimeScores(GameModel gameModel, String winnerId) {
        boolean hasWinner = winnerId != null && !gameModel.isTie();

        for (String playerId : gameModel.getPlayerIds()) {
            Player player = playerService.getPlayer(playerId);

            if (hasWinner && playerId.equals(winnerId)) {
                player.addLifetimeScore(VICTORY_BONUS);
                // Use updatePlayerSafely to prevent accidental data loss
                playerService.updatePlayerSafely(playerId, p -> p.setLifetimeScore(player.getLifetimeScore()));
            }

            if (player.getNakamaUserId() != null && !player.getNakamaUserId().isEmpty()) {
                nakamaLeaderBoardService.submitPlayerScore(player.getNakamaUserId(), player.getLifetimeScore(),
                    player.getName());
            }
        }
    }

    private void handleTurnSwitching(GameModel gameModel) {
        String currentPlayerId = gameModel.getCurrentPlayerId();

        // Try to switch to next player first
        switchToNextPlayer(gameModel);

        // If next player has no valid moves, check if current player can continue
        if (!hasValidMoves(gameModel, gameModel.getCurrentPlayerId())
                && hasValidMoves(gameModel, currentPlayerId)) {
            // Switch back to current player if they still have valid moves.
            // If neither can move, the game will end on the next check.
            gameModel.setCurrentPlayerId(currentPlayerId);
        }
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
