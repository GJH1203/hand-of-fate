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
import com.cardgame.service.player.DeckService;
import com.cardgame.service.player.PlayerService;
import com.cardgame.service.util.ScoreCalculator;
import com.cardgame.service.validator.GameValidator;
import org.checkerframework.checker.units.qual.C;
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
    private final GameRepository gameRepository;
    private final PlayerService playerService;
    private final CardService cardService;
    private final DeckService deckService;
    private final BoardManager boardManager;
    private final GameValidator gameValidator;
    private final MoveStrategyFactory moveStrategyFactory;

    public GameService(GameRepository gameRepository,
                       PlayerService playerService,
                       CardService cardService,
                       DeckService deckService,
                       BoardManager boardManager,
                       GameValidator gameValidator,
                       MoveStrategyFactory moveStrategyFactory) {
        this.gameRepository = gameRepository;
        this.playerService = playerService;
        this.cardService = cardService;
        this.deckService = deckService;
        this.boardManager = boardManager;
        this.gameValidator = gameValidator;
        this.moveStrategyFactory = moveStrategyFactory;
    }

    private GameDto convertToDto(GameModel gameModel) {
        Player currentPlayer = playerService.getPlayer(gameModel.getCurrentPlayerId());

        // Create the builder first
        ImmutableGameDto.Builder builder = ImmutableGameDto.builder()
                .id(gameModel.getId())
                .state(gameModel.getGameState())
                .board(ImmutableBoardDto.builder()
                        .width(gameModel.getBoard().getWidth())
                        .height(gameModel.getBoard().getHeight())
                        .pieces(convertPiecesToDto(gameModel.getBoard().getPieces()))
                        .build())
                .currentPlayerId(gameModel.getCurrentPlayerId())
                .currentPlayerHand(currentPlayer.getHand().stream()
                        .map(this::convertCardToDto)
                        .collect(Collectors.toList()))
                .createdAt(gameModel.getCreatedAt())
                .updatedAt(gameModel.getUpdatedAt());

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
        return ImmutableCardDto.builder()
                .id(card.getId())
                .power(card.getPower())
                .name(card.getName())
                .build();
    }

    private Map<PositionDto, String> convertPiecesToDto(Map<String, String> pieces) {
        return pieces.entrySet().stream()
                .collect(Collectors.toMap(
                        entry -> {
                            Position pos = Position.fromStorageString(entry.getKey());
                            return ImmutablePositionDto.builder()
                                    .x(pos.getX())
                                    .y(pos.getY())
                                    .build();
                        },
                        Map.Entry::getValue
                ));
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
        Deck deck = deckService.getDeck(deckId);

        // Create a copy of the deck for this game
        Deck gameDeck = new Deck();
        gameDeck.setId(UUID.randomUUID().toString());
        gameDeck.setOwnerId(playerId);
        gameDeck.setCards(new ArrayList<>(deck.getCards())); // Copy cards from original deck
        gameDeck.setRemainingCards(deck.getCards().size());

        // Save game deck
        gameDeck = deckService.saveDeck(gameDeck);

        // Draw initial hand (5 cards)
        List<Card> initialHand = new ArrayList<>(gameDeck.getCards().subList(0, 5));
        gameDeck.getCards().subList(0, 5).clear();
        gameDeck.setRemainingCards(gameDeck.getCards().size());

        // Update player's game state
        player.setCurrentDeck(gameDeck);
        player.setHand(initialHand);
        player.setScore(0);
        player.setPlacedCards(new HashMap<>());

        // Save updated player state
        playerService.savePlayer(player);
    }

    private void placeInitialCards(GameModel gameModel, String player1Id, String player2Id) {
        Board board = gameModel.getBoard();

        placeInitialCardForPlayer(player1Id, new Position(2, 4), board);
        placeInitialCardForPlayer(player2Id, new Position(2, 0), board);
    }

    private void placeInitialCardForPlayer(String playerId, Position position, Board board) {
        Player player = playerService.getPlayer(playerId);
        Card card = player.getHand().remove(0);
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
            switchToNextPlayer(gameModel);
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

        Player currentPlayer = playerService.getPlayer(gameModel.getCurrentPlayerId());
        return currentPlayer.getHand().isEmpty() || !hasValidMoves(gameModel, currentPlayer);
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

            // Calculate and update player scores
            ScoreCalculator.updatePlayerScore(player, gameModel);
            playerService.savePlayer(player);

            // Store scores in the game model
            gameModel.updatePlayerScore(playerId, player.getScore());
        }

        // Determine winner
        String winnerId = ScoreCalculator.determineWinner(gameModel);
        gameModel.setWinnerId(winnerId);
        gameModel.setTie(winnerId == null);
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
