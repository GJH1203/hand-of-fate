package com.cardgame.dto.game;

import com.cardgame.model.Card;
import com.cardgame.model.Position;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutablePlayerMoveRequest.class)
@JsonDeserialize(as = ImmutablePlayerMoveRequest.class)
public interface PlayerMoveRequest {
    @Value.Parameter
    @JsonProperty("playerId")
    String getPlayerId();

    @Value.Parameter
    @JsonProperty("card")
    Card getCard();

    @Value.Parameter
    @JsonProperty("position")
    Position getPosition();

    @Value.Check
    default void check() {
        if (getPlayerId() == null || getPlayerId().isEmpty()) {
            throw new IllegalStateException("Player ID is required");
        }
        if (getCard() == null) {
            throw new IllegalStateException("Card is required");
        }
        if (getPosition() == null) {
            throw new IllegalStateException("Position is required");
        }
    }
}
