package com.cardgame.dto.game;

import com.cardgame.model.Card;
import com.cardgame.model.Position;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableWinRequestRequest.class)
@JsonDeserialize(as = ImmutableWinRequestRequest.class)
public interface WinRequestRequest {
    @Value.Parameter
    @JsonProperty("playerId")
    String getPlayerId();

    @Value.Check
    default void check() {
        if (getPlayerId() == null || getPlayerId().isEmpty()) {
            throw new IllegalStateException("Player ID is required");
        }
    }
}
