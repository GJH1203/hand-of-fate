package com.cardgame.service.strategy;

import com.cardgame.dto.PlayerAction;
import com.cardgame.model.GameModel;
import org.springframework.stereotype.Service;

@Service
public class PlaceCardStrategy implements MoveStrategy {

    /**
     * Plays a card onto the board.
     *
     * <p>Hand and board are both on the game, so this changes one object and saves
     * nothing — the caller writes the game once, whatever the move was.
     */
    @Override
    public void executeMove(GameModel gameModel, PlayerAction action) {
        gameModel.playCard(action.getPlayerId(), action.getTargetPosition(), action.getCard());
    }
}
