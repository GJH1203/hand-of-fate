package com.cardgame.service.strategy;

import com.cardgame.dto.PlayerAction;
import com.cardgame.exception.game.InvalidMoveException;
import com.cardgame.model.GameModel;

/**
 * Strategy for handling win calculation requests
 */
public class WinRequestStrategy implements MoveStrategy {

    @Override
    public void executeMove(GameModel gameModel, PlayerAction action) {
        String requestingPlayerId = action.getPlayerId();

        // Ensure this action is only used for its intended purpose
        if (action.getType() != PlayerAction.ActionType.REQUEST_WIN_CALCULATION) {
            throw new InvalidMoveException("Invalid strategy used for action type: " + action.getType());
        }

        // Set the pending win request state
        gameModel.setHasPendingWinRequest(true);
        gameModel.setPendingWinRequestPlayerId(requestingPlayerId);
    }
}
