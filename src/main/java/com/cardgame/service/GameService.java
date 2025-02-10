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

//    public GameDto createGame(GameState gameState) {
//        Map<Position, String> emptyPieces = new HashMap<>();
//        Board board = new Board(3, 5, emptyPieces); // Default size 3x5
//        GameModel gameModel = new GameModel(UUID.randomUUID().toString(), gameState, board);
//        gameModel = gameRepository.save(gameModel);
//        return convertToDto(gameModel);
//    }
//
//    public GameDto updateGame(String gameId, GameState gameState, int width, int height, Map<Position, String> pieces) throws Throwable {
//        GameModel gameModel = (GameModel) gameRepository
//                .findById(gameId)
//                .orElseThrow(() -> new RuntimeException("Game not found"));
//        Board board = new Board(width, height, pieces);
//        gameModel.updateGame(gameState, board);
//        gameModel = (GameModel) gameRepository.save(gameModel);
//        return convertToDto(gameModel);
//    }
//
    private GameDto convertToDto(GameModel gameModel) {
        return ImmutableGameDto.builder()
            .id(gameModel.getId())
            .state(gameModel.getGameState())
            .board(ImmutableBoardDto.builder()
                    .width(gameModel.getBoard().getWidth())
                    .height(gameModel.getBoard().getHeight())
                    .pieces(convertPiecesToDto(gameModel.getBoard().getPieces()))
                    .build())
            .currentPlayerId(gameModel.getCurrentPlayerId())  // Add this line
            .createdAt(gameModel.getCreatedAt())
            .updatedAt(gameModel.getUpdatedAt())
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

        validatePlayersAndDecks(player1Id, player2Id, deck1Id, deck2Id);

        // create a new game model
        GameModel gameModel = new GameModel();
        gameModel.setId(UUID.randomUUID().toString());
        gameModel.setGameState(GameState.INITIALIZED);

        // initialize the board (3*5)
        Board board = new Board();
        gameModel.setBoard(board);

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

    private void validatePlayersAndDecks(String player1Id, String player2Id,
                                         String deck1Id, String deck2Id) {
        // Validate players exist
        Player player1 = playerService.getPlayer(player1Id);
        Player player2 = playerService.getPlayer(player2Id);
        if (player1 == null || player2 == null) {
            throw new IllegalArgumentException("One or both players not found");
        }

        // Validate decks exist and belong to respective players
        Deck deck1 = deckService.getDeck(deck1Id);
        Deck deck2 = deckService.getDeck(deck2Id);
        if (deck1 == null || deck2 == null) {
            throw new IllegalArgumentException("One or both decks not found");
        }

        // Validate deck ownership
        if (!deck1.getOwnerId().equals(player1Id) || !deck2.getOwnerId().equals(player2Id)) {
            throw new IllegalArgumentException("Deck ownership mismatch");
        }

        // Validate deck sizes (should be 15 cards each)
        if (deck1.getCards().size() != 15 || deck2.getCards().size() != 15) {
            throw new IllegalArgumentException("Decks must contain exactly 15 cards");
        }
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

        // Place initial card for player 1 at bottom center (2, 4)
        Player player1 = playerService.getPlayer(player1Id);
        Card player1Card = player1.getHand().remove(0); // Take first card from hand
        Position player1Pos = new Position(2, 4);
        board.placeCard(player1Pos, player1Card.getId());
        // Convert position to string key (e.g., "2,4")
        String player1PosKey = String.format("%d,%d", player1Pos.getX(), player1Pos.getY());
        player1.getPlacedCards().put(player1PosKey, player1Card);

        // Place initial card for player 2 at top center (2, 0)
        Player player2 = playerService.getPlayer(player2Id);
        Card player2Card = player2.getHand().remove(0); // Take first card from hand
        Position player2Pos = new Position(2, 0);
        board.placeCard(player2Pos, player2Card.getId());
        // Convert position to string key (e.g., "2,0")
        String player2PosKey = String.format("%d,%d", player2Pos.getX(), player2Pos.getY());
        player2.getPlacedCards().put(player2PosKey, player2Card);

        // Save updated players
        playerService.savePlayer(player1);
        playerService.savePlayer(player2);
    }

    /**
     * Process a player's move
     */
    public GameDto processMove(String gameId, PlayerAction action) {
        GameModel gameModel = gameRepository.findById(gameId)
                .orElseThrow(() -> new GameNotFoundException("Game not found: " + gameId));

        // Debug logging before
        System.out.println("===== Before Move =====");
        System.out.println("Current player: " + gameModel.getCurrentPlayerId());

        // Validate turn and game state
        System.out.println("Entering validatePlayerTurn with playerId: " + action.getPlayerId());
        validatePlayerTurn(gameModel, action.getPlayerId());

        if (action.getType() == PlayerAction.ActionType.PLACE_CARD) {
            validateMove(gameModel, action);
            executeMove(gameModel, action);
        } else if (action.getType() == PlayerAction.ActionType.PASS) {
            handlePass(gameModel, action.getPlayerId());
        }

        // Check if game is over
        if (isGameOver(gameModel)) {
            finalizeGame(gameModel);
        } else {
            switchToNextPlayer(gameModel);
        }

        // Update timestamp
        gameModel.setUpdatedAt(Instant.now());

        // Debug logging after
        System.out.println("===== After Move =====");
        System.out.println("Next player: " + gameModel.getCurrentPlayerId());

        // Save and return updated game state
        gameModel = gameRepository.save(gameModel);

        // Verify save
        System.out.println("===== After Save =====");
        System.out.println("Saved current player: " + gameModel.getCurrentPlayerId());

        return convertToDto(gameModel);
    }

    /**
     * Validate if it's player's turn and game is activated
     */
    private void validatePlayerTurn(GameModel gameModel, String playerId) {
        if (gameModel.getGameState() != GameState.IN_PROGRESS) {
            throw new InvalidMoveException("Game is not in progress");
        }
        if (!playerId.equals(gameModel.getCurrentPlayerId())) {
            throw new InvalidMoveException("Not your turn");
        }
    }

    /**
     * Check if move is valid according to game rules
     */
    private void validateMove(GameModel gameModel, PlayerAction action) {
        Position targetPos = action.getTargetPosition();
        Card card = action.getCard();
        Player player = playerService.getPlayer(action.getPlayerId());

        // Check if position is valid and empty
        if (!gameModel.getBoard().isPositionValid(targetPos) ||
                !gameModel.getBoard().isPositionEmpty(targetPos)) {
            throw new InvalidMoveException("Invalid or occupied position");
        }

        // Check if player has the card
        if (!player.getHand().contains(card)) {
            throw new InvalidMoveException("Card not in player's hand");
        }

        // Check adjacency rule
        boolean hasAdjacentCard = false;
        List<Position> adjacentPositions = gameModel.getBoard().getAdjacentPositions(targetPos);

        for (Position adj : adjacentPositions) {
            String cardId = gameModel.getBoard().getCardIdAt(adj);
            if (cardId != null) {
                // Check if the adjacent card belongs to the current player
                boolean isPlayerCard = player.getPlacedCards().values().stream()
                        .anyMatch(c -> c.getId().equals(cardId));
                if (isPlayerCard) {
                    hasAdjacentCard = true;
                    break;
                }
            }
        }

        // Exception for first move of each player
        if (player.getPlacedCards().isEmpty()) {
            // First move - check if it's at the designated starting position
            boolean isValidStartPos = isValidStartingPosition(targetPos, action.getPlayerId(), gameModel);
            if (!isValidStartPos) {
                throw new InvalidMoveException("Invalid starting position");
            }
        } else if (!hasAdjacentCard) {
            throw new InvalidMoveException("Must place card adjacent to your existing cards");
        }
    }

    private boolean isValidStartingPosition(Position pos, String playerId, GameModel gameModel) {
        // Player 1's starting position is (2, 4), Player 2's is (2, 0)
        if (playerId.equals(gameModel.getPlayerIds().get(0))) {
            return pos.getX() == 2 && pos.getY() == 4;
        } else {
            return pos.getX() == 2 && pos.getY() == 0;
        }
    }

    /**
     * Calculate current board scores
     */

    /**
     * Handle pass action
     */
    private void handlePass(GameModel gameModel, String playerId) {
        // For now, just switch turns
        // Could add additional logic here if needed
    }

    /**
     * Check if game is over
     */
    private boolean isGameOver(GameModel gameModel) {
        Board board = gameModel.getBoard();

        // Game is over if board is full
        if (board.isFull()) {
            return true;
        }

        // Check if current player has any valid moves
        Player currentPlayer = playerService.getPlayer(gameModel.getCurrentPlayerId());
        if (currentPlayer.getHand().isEmpty()) {
            return true;
        }

        // Check if there are any valid positions for current player
        return !hasValidMoves(gameModel, currentPlayer);
    }

    /**
     * Check if player has any valid moves
     */
    private boolean hasValidMoves(GameModel gameModel, Player player) {
        Board board = gameModel.getBoard();
        List<Position> emptyPositions = board.getEmptyPositions();

        for (Position pos : emptyPositions) {
            // Check if any card in hand can be placed at this position
            PlayerAction testAction = ImmutablePlayerAction.builder()
                    .type(PlayerAction.ActionType.PLACE_CARD)
                    .playerId(player.getId())
                    .targetPosition(pos)
                    .card(player.getHand().get(0)) // Just need any card for adjacency check
                    .timestamp(System.currentTimeMillis())
                    .build();

            try {
                validateMove(gameModel, testAction);
                return true;
            } catch (InvalidMoveException e) {
                // Continue checking other positions
            }
        }
        return false;
    }

    /**
     * Execute the move
     */
    private void executeMove(GameModel gameModel, PlayerAction action) {
        Player player = playerService.getPlayer(action.getPlayerId());
        Card card = action.getCard();
        Position position = action.getTargetPosition();

        // Remove card from hand
        player.getHand().remove(card);

        // Place card on board
        gameModel.getBoard().placeCard(position, card.getId());
        // Convert position to storage format before putting in placedCards
        player.getPlacedCards().put(position.toStorageString(), card);

        // Update player score
        updatePlayerScore(player);

        // Save updated player state
        playerService.savePlayer(player);
    }

    /**
     * Finalize the game and create result
     */
    private void finalizeGame(GameModel gameModel) {
        gameModel.setGameState(GameState.COMPLETED);

        // Calculate final scores
        Player player1 = playerService.getPlayer(gameModel.getPlayerIds().get(0));
        Player player2 = playerService.getPlayer(gameModel.getPlayerIds().get(1));

        updatePlayerScore(player1);
        updatePlayerScore(player2);

        playerService.savePlayer(player1);
        playerService.savePlayer(player2);
    }

    /**
     * Update player's score
     */
    private void updatePlayerScore(Player player) {
        int totalScore = player.getPlacedCards().values().stream()
                .mapToInt(Card::getPower)
                .sum();
        player.setScore(totalScore);
    }

    /**
     * Switch to next player
     */
    private void switchToNextPlayer(GameModel gameModel) {
        List<String> playerIds = gameModel.getPlayerIds();
        String currentPlayerId = gameModel.getCurrentPlayerId();

        // Debug logging
        System.out.println("===== Turn Switch Debug =====");
        System.out.println("PlayerIds in game: " + playerIds);
        System.out.println("Current player ID: " + currentPlayerId);

        int currentIndex = playerIds.indexOf(currentPlayerId);
        int nextIndex = (currentIndex + 1) % playerIds.size();
        String nextPlayerId = playerIds.get(nextIndex);

        System.out.println("Current index: " + currentIndex);
        System.out.println("Next index: " + nextIndex);
        System.out.println("Next player will be: " + nextPlayerId);
        System.out.println("==========================");

        gameModel.setCurrentPlayerId(nextPlayerId);
    }

    public GameDto getGame(String gameId) {
        GameModel gameModel = gameRepository.findById(gameId)
                .orElseThrow(() -> new GameNotFoundException("Game not found: " + gameId));
        return convertToDto(gameModel);
    }
}
