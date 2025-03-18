package com.cardgame.service.factory;

import com.cardgame.dto.PlayerAction;
import com.cardgame.service.manager.BoardManager;
import com.cardgame.service.player.PlayerService;
import com.cardgame.service.strategy.MoveStrategy;
import com.cardgame.service.strategy.PassStrategy;
import com.cardgame.service.strategy.PlaceCardStrategy;
import com.cardgame.service.strategy.WinRequestStrategy;
import com.cardgame.service.strategy.WinResponseStrategy;
import org.springframework.stereotype.Service;

@Service
public class MoveStrategyFactory {
    private final PlayerService playerService;
    private final BoardManager boardManager;

    public MoveStrategyFactory(PlayerService playerService, BoardManager boardManager) {
        this.playerService = playerService;
        this.boardManager = boardManager;
    }

    public MoveStrategy createStrategy(PlayerAction.ActionType actionType) {
        return switch (actionType) {
            case PLACE_CARD -> new PlaceCardStrategy(playerService, boardManager);
            case PASS -> new PassStrategy();
            case REQUEST_WIN_CALCULATION -> new WinRequestStrategy();
            case RESPOND_TO_WIN_REQUEST -> new WinResponseStrategy();
            default -> throw new IllegalArgumentException("Unknown action type: " + actionType);
        };
    }
}
