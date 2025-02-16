package com.cardgame.service.validator;

import com.cardgame.dto.PlayerAction;
import com.cardgame.model.GameModel;

public interface GameValidator {
    void validatePlayerAndDecks(String player1Id, String player2Id, String deck1Id, String deck2Id);
    void validatePlayerTurn(GameModel gameModel, String playerId);
    void validateMove(GameModel gameModel, PlayerAction action);
}
