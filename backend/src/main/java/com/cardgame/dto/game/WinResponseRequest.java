package com.cardgame.dto.game;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableWinResponseRequest.class)
@JsonDeserialize(as = ImmutableWinResponseRequest.class)
public interface WinResponseRequest {
    @Value.Parameter
    @JsonProperty("playerId")
    String getPlayerId();

    @Value.Parameter
    @JsonProperty("accepted")
    boolean isAccepted();

    @Value.Check
    default void check() {
        if (getPlayerId() == null || getPlayerId().isEmpty()) {
            throw new IllegalStateException("Player ID is required");
        }
    }
}
