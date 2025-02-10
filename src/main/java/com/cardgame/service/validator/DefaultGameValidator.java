package com.cardgame.service.validator;

import java.util.List;
import java.util.Objects;
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

        if (deck1.getCards().size() != 15 || deck2.getCards().size() != 15) {
            throw new IllegalArgumentException("Decks must contain exactly 15 cards");
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

    @Override
    public void validateMove(GameModel gameModel, PlayerAction action) {
        Position targetPos = action.getTargetPosition();
        Card card = action.getCard();
        Player player = playerService.getPlayer(action.getPlayerId());

        if (!boardManager.isValidPosition(gameModel.getBoard(), targetPos)) {
            throw new InvalidMoveException("Invalid or occupied position");
        }

        if (!player.getHand().contains(card)) {
            throw new InvalidMoveException("Card not in player's hand");
        }

        validateCardPlacement(gameModel, player, targetPos);
    }

    private void validateCardPlacement(GameModel gameModel, Player player, Position targetPos) {
        if (player.getPlacedCards().isEmpty()) {
            validateFirstMove(targetPos, player.getId(), gameModel);
            return;
        }

        validateAdjacentPlacement(gameModel, player, targetPos);
    }

    private void validateFirstMove(Position pos, String playerId, GameModel gameModel) {
        boolean isValidStartPos = (playerId.equals(gameModel.getPlayerIds().get(0)))
                ? pos.getX() == 2 && pos.getY() == 4  // Player 1 starting position
                : pos.getX() == 2 && pos.getY() == 0; // Player 2 starting position

        if (!isValidStartPos) {
            throw new InvalidMoveException("Invalid starting position");
        }
    }

    private void validateAdjacentPlacement(GameModel gameModel, Player player, Position targetPos) {
        List<Position> adjacentPositions = boardManager.getAdjacentPositions(gameModel.getBoard(), targetPos);
        boolean hasAdjacentCard = adjacentPositions.stream()
                .map(pos -> gameModel.getBoard().getCardIdAt(pos))
                .filter(Objects::nonNull)
                .anyMatch(cardId -> player.getPlacedCards().values().stream()
                        .anyMatch(c -> c.getId().equals(cardId)));

        if (!hasAdjacentCard) {
            throw new InvalidMoveException("Must place card adjacent to your existing cards");
        }
    }
}
