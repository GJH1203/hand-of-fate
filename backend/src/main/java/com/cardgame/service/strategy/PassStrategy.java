package com.cardgame.service.strategy;

import com.cardgame.dto.PlayerAction;
import com.cardgame.model.GameModel;
import org.springframework.stereotype.Service;

@Service
public class PassStrategy implements MoveStrategy {
    @Override
    public void executeMove(GameModel gameModel, PlayerAction action) {
        // Handle pass logic
    }
}
