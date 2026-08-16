package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutablePositionDto.class)
@JsonDeserialize(as = ImmutablePositionDto.class)
public interface PositionDto {
    int getX();
    int getY();
}
