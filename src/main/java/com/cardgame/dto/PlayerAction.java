package com.cardgame.dto;

import com.cardgame.model.Card;
import com.cardgame.model.Position;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutablePlayerAction.class)
@JsonDeserialize(as = ImmutablePlayerAction.class)
public interface PlayerAction {
    // The type of action being performed
    ActionType getType();

    // The player performing the action
    String getPlayerId();

    // The card being played (optional - might be null for PASS action)
    Card getCard();

    // The target position (optional - might be null for PASS action)
    Position getTargetPosition();

    // Timestamp of when the action was created
    long getTimestamp();

    // Action type enum
    enum ActionType {
        PLACE_CARD,
        PASS
    }
}
