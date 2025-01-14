package com.cardgame.service.player;

import com.cardgame.dto.ImmutablePlayerAction;
import com.cardgame.dto.PlayerAction;
import com.cardgame.model.Card;
import com.cardgame.model.Position;
import com.cardgame.service.GameService;
import org.springframework.stereotype.Service;

@Service
public class PlayerActionService {

    /**
     * Creates a card placement action
     */
    public PlayerAction placeCard(String playerId, Card card, Position position) {
        // Basic validation
//        if (playerId == null || card == null || position == null) {
//            throw new InvalidActionException("Player ID, card, and position are required");
//        }

        return ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PLACE_CARD)
                .playerId(playerId)
                .card(card)
                .targetPosition(position)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Creates a pass action
     */
    public PlayerAction pass(String playerId) {
//        if (playerId == null) {
//            throw new InvalidActionException("Player ID is required");
//        }

        return ImmutablePlayerAction.builder()
                .type(PlayerAction.ActionType.PASS)
                .playerId(playerId)
                .timestamp(System.currentTimeMillis())
                .build();
    }


}
