package com.cardgame.service.strategy;

import com.cardgame.dto.PlayerAction;
import com.cardgame.model.GameModel;
import com.cardgame.model.Player;

public interface MoveStrategy {
    void executeMove(GameModel gameModel, PlayerAction action);
}
