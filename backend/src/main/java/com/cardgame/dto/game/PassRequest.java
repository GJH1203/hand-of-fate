package com.cardgame.dto.game;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutablePassRequest.class)
@JsonDeserialize(as = ImmutablePassRequest.class)
public interface PassRequest {

    @Value.Parameter
    @JsonProperty("playerId")
    String getPlayerId();

    @Value.Check
    default void check() {
        if (getPlayerId() == null || getPlayerId().isEmpty()) {
            throw new IllegalArgumentException("PlayerId cannot be empty");
        }
    }
}
