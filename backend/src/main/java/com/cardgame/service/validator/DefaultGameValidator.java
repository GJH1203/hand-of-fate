package com.cardgame.service.validator;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import com.cardgame.dto.PlayerAction;
import com.cardgame.exception.game.InvalidMoveException;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.GameModel;
import com.cardgame.model.GameState;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.service.manager.BoardManager;
import com.cardgame.service.player.DeckService;
import com.cardgame.service.player.PlayerService;
import org.springframework.stereotype.Service;

@Service
public class DefaultGameValidator implements GameValidator {
    private final PlayerService playerService;
    private final DeckService deckService;
    private final BoardManager boardManager;

    public DefaultGameValidator(
            PlayerService playerService,
            DeckService deckService,
            BoardManager boardManager) {
        this.playerService = playerService;
        this.deckService = deckService;
        this.boardManager = boardManager;
    }

    @Override
    public void validatePlayerAndDecks(String player1Id, String player2Id, String deck1Id, String deck2Id) {
        // Implementation of validation logic
        Player player1 = playerService.getPlayer(player1Id);
        Player player2 = playerService.getPlayer(player2Id);
        if (player1 == null || player2 == null) {
            throw new IllegalArgumentException("One or both players not found");
        }

        Deck deck1 = deckService.getDeck(deck1Id);
        Deck deck2 = deckService.getDeck(deck2Id);
        if (deck1 == null || deck2 == null) {
            throw new IllegalArgumentException("One or both decks not found");
        }

        if (!deck1.getOwnerId().equals(player1Id) || !deck2.getOwnerId().equals(player2Id)) {
            throw new IllegalArgumentException("Deck ownership mismatch");
        }

        if (deck1.getCards().size() != 5 || deck2.getCards().size() != 5) {
            throw new IllegalArgumentException("Decks must contain exactly 5 cards");
        }
    }

    @Override
    public void validatePlayerTurn(GameModel gameModel, String playerId) {
        if (gameModel.getGameState() != GameState.IN_PROGRESS) {
            throw new InvalidMoveException("Game is not in progress");
        }
        if (!playerId.equals(gameModel.getCurrentPlayerId())) {
            throw new InvalidMoveException("Not your turn");
        }
    }

    /**
     * Validates a placement against the game alone.
     *
     * <p>This used to load the player to reach their hand and their cards on the board.
     * Both are on the game now, so validating a move reads nothing.
     */
    @Override
    public void validateMove(GameModel gameModel, PlayerAction action) {
        Position targetPos = action.getTargetPosition();
        Card card = action.getCard();
        String playerId = action.getPlayerId();

        if (!boardManager.isValidPosition(gameModel.getBoard(), targetPos)) {
            throw new InvalidMoveException("Invalid or occupied position");
        }

        if (!gameModel.handOf(playerId).contains(card)) {
            throw new InvalidMoveException("Card not in player's hand");
        }

        // After game initialization, players always have cards on board, so adjacency rules always apply
        validateAdjacentPlacement(gameModel, playerId, targetPos);
    }

    private void validateAdjacentPlacement(GameModel gameModel, String playerId, Position targetPos) {
        Set<String> ownCardIds = gameModel.placedCardsOf(playerId).values().stream()
                .map(Card::getId)
                .collect(Collectors.toSet());

        List<Position> adjacentPositions = boardManager.getAdjacentPositions(gameModel.getBoard(), targetPos);
        boolean hasAdjacentCard = adjacentPositions.stream()
                .map(pos -> gameModel.getBoard().getCardIdAt(pos))
                .filter(Objects::nonNull)
                .anyMatch(ownCardIds::contains);

        if (!hasAdjacentCard) {
            throw new InvalidMoveException("Must place card adjacent to your existing cards");
        }
    }
}
