package com.cardgame.service.core;

import com.cardgame.dto.GameDto;
import com.cardgame.dto.PlayerAction;

public interface GameStateManager {
    GameDto processMove(String gameId, PlayerAction action);
    GameDto getGame(String gameId);
}
