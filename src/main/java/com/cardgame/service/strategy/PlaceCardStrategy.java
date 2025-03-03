package com.cardgame.service.strategy;

import com.cardgame.dto.PlayerAction;
import com.cardgame.dto.PositionDto;
import com.cardgame.model.Card;
import com.cardgame.model.GameModel;
import com.cardgame.model.Player;
import com.cardgame.model.Position;
import com.cardgame.service.manager.BoardManager;
import com.cardgame.service.player.PlayerService;
import com.cardgame.service.util.ScoreCalculator;
import org.springframework.stereotype.Service;

@Service
public class PlaceCardStrategy implements MoveStrategy {
    private final PlayerService playerService;
    private final BoardManager boardManager;

    public PlaceCardStrategy(PlayerService playerService, BoardManager boardManager) {
        this.playerService = playerService;
        this.boardManager = boardManager;
    }

    @Override
    public void executeMove(GameModel gameModel, PlayerAction action) {
        Player player = playerService.getPlayer(action.getPlayerId());
        Card card = action.getCard();
        Position position = action.getTargetPosition();

        player.getHand().remove(card);
        boardManager.placeCard(gameModel.getBoard(), position, card.getId());
        player.getPlacedCards().put(position.toStorageString(), card);

        // Update player score after placing the card
        ScoreCalculator.updatePlayerScore(player, gameModel);

        playerService.savePlayer(player);
    }
}
