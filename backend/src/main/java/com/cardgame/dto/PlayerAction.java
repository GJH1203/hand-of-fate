package com.cardgame.dto;

import com.cardgame.model.Card;
import com.cardgame.model.Position;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.mongodb.lang.Nullable;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutablePlayerAction.class)
@JsonDeserialize(as = ImmutablePlayerAction.class)
public interface PlayerAction {

    @JsonProperty("type")
    ActionType getType();

    // The player performing the action
    @JsonProperty("playerId")
    String getPlayerId();

    // The card being played (optional - might be null for PASS action)
    @JsonProperty("card")
    @Nullable
    Card getCard();

    // The target position (optional - might be null for PASS action)
    @JsonProperty("targetPosition")
    @Nullable
    Position getTargetPosition();

    // General purpose action data field (optional - used for RESPOND_TO_WIN_REQUEST)
    @JsonProperty("actionData")
    @Nullable
    Object getActionData();

    // Timestamp of when the action was created
    @JsonProperty("timestamp")
    long getTimestamp();

    // Action type enum
    enum ActionType {
        PLACE_CARD,
        PASS,
        REQUEST_WIN_CALCULATION,  // New: Request an early win calculation
        RESPOND_TO_WIN_REQUEST    // New: Accept or reject a win request
    }

    @Value.Check
    default void check() {
        if (getType() == ActionType.PLACE_CARD) {
            if (getCard() == null) {
                throw new IllegalStateException("Card is required for PLACE_CARD action");
            }
            if (getTargetPosition() == null) {
                throw new IllegalStateException("Target position is required for PLACE_CARD action");
            }
        }

        if (getType() == ActionType.RESPOND_TO_WIN_REQUEST) {
            if (getActionData() == null) {
                throw new IllegalStateException("Action data is required for RESPOND_TO_WIN_REQUEST action");
            }
            if (!(getActionData() instanceof Boolean)) {
                throw new IllegalStateException("Action data must be a boolean for RESPOND_TO_WIN_REQUEST action");
            }
        }

        if (getPlayerId() == null || getPlayerId().isEmpty()) {
            throw new IllegalStateException("Player ID is required");
        }
        if (getTimestamp() <= 0) {
            throw new IllegalStateException("Invalid timestamp");
        }
    }
}
