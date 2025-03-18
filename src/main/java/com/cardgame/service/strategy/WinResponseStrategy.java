package com.cardgame.service.strategy;

import com.cardgame.dto.PlayerAction;
import com.cardgame.exception.game.InvalidMoveException;
import com.cardgame.model.GameModel;

/**
 * Strategy for handling responses to win calculation requests
 */
public class WinResponseStrategy implements MoveStrategy {

    @Override
    public void executeMove(GameModel gameModel, PlayerAction action) {
        // Ensure this action is only used for its intended purpose
        if (action.getType() != PlayerAction.ActionType.RESPOND_TO_WIN_REQUEST) {
            throw new InvalidMoveException("Invalid strategy used for action type: " + action.getType());
        }

        // Ensure there is an active win request
        if (!gameModel.hasPendingWinRequest()) {
            throw new InvalidMoveException("There is no pending win request to respond to");
        }

        // Extract the acceptance boolean from the action data
        Boolean accepted = false;
        if (action.getActionData() instanceof Boolean) {
            accepted = (Boolean) action.getActionData();
        } else {
            throw new InvalidMoveException("Response action must include a boolean acceptance value");
        }

        // If rejected, clear the request and return to the requesting player's turn
        if (!accepted) {
            String requestingPlayerId = gameModel.getPendingWinRequestPlayerId();

            gameModel.setHasPendingWinRequest(false);
            gameModel.setPendingWinRequestPlayerId(null);

            // Return to the requesting player's turn
            gameModel.setCurrentPlayerId(requestingPlayerId);
        }
        // If accepted, do nothing here - the game will be finalized in the GameService
    }
}
