package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableCreateCardRequest.class)
@JsonDeserialize(as = ImmutableCreateCardRequest.class)
public interface CreateCardRequest {
    int getPower();
    String getName();
}
