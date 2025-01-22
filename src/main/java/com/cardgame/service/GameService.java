package com.cardgame.service;

import com.cardgame.dto.*;
import com.cardgame.model.Board;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.repository.GameRepository;
import com.cardgame.service.player.DeckService;
import com.cardgame.service.player.PlayerService;
import org.checkerframework.checker.units.qual.C;
import org.springframework.stereotype.Service;

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
//    private final DeckService deckService;

    public GameService(GameRepository gameRepository, PlayerService playerService, CardService cardService, DeckService deckService) {
        this.gameRepository = gameRepository;
        this.playerService = playerService;
        this.cardService = cardService;
        this.deckService = deckService;
    }

    public GameDto createGame(GameState gameState, int width, int height, Map<Position, String> pieces) {
        Board board = new Board(width, height, pieces);
        GameModel gameModel = new GameModel(null, gameState, board);
        gameModel = (GameModel) gameRepository.save(gameModel);
        return convertToDto(gameModel);
    }

    public GameDto updateGame(String gameId, GameState gameState, int width, int height, Map<Position, String> pieces) throws Throwable {
        GameModel gameModel = (GameModel) gameRepository
                .findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        Board board = new Board(width, height, pieces);
        gameModel.updateGame(gameState, board);
        gameModel = (GameModel) gameRepository.save(gameModel);
        return convertToDto(gameModel);
    }

    private GameDto convertToDto(GameModel gameModel) {
        return ImmutableGameDto.builder()
                .id(gameModel.getId())
                .state(gameModel.getGameState())
                .board(ImmutableBoardDto.builder()
                        .width(gameModel.getBoard().getWidth())
                        .height(gameModel.getBoard().getHeight())
                        .pieces(convertPiecesToDto(gameModel.getBoard().getPieces()))
                        .build())
                .createdAt(gameModel.getCreatedAt())
                .updatedAt(gameModel.getUpdatedAt())
                .build();
    }

    private Map<PositionDto, String> convertPiecesToDto(Map<Position, String> pieces) {
        return pieces.entrySet().stream()
                .collect(Collectors.toMap(
                        entry -> ImmutablePositionDto.builder()
                                .x(entry.getKey().getX())
                                .y(entry.getKey().getY())
                                .build(),
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
        player1.getPlacedCards().put(player1Pos, player1Card);

        // Place initial card for player 2 at top center (2, 0)
        Player player2 = playerService.getPlayer(player2Id);
        Card player2Card = player2.getHand().remove(0); // Take first card from hand
        Position player2Pos = new Position(2, 0);
        board.placeCard(player2Pos, player2Card.getId());
        player2.getPlacedCards().put(player2Pos, player2Card);

        // Save updated players
        playerService.savePlayer(player1);
        playerService.savePlayer(player2);
    }

    /**
     * Process a player's move
     */

    /**
     * Validate if it's player's turn and game is activated
     */

    /**
     * Check if move is valid according to game rules
     */

    /**
     * Calculate current board scores
     */

    /**
     * Check if game is over
     */

    /**
     * Finalize the game and create result
     */

    /**
     * Determine winner based on scores
     */

    /**
     * Switch to next player
     */
}
