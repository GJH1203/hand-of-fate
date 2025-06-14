package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableCardDto.class)
@JsonDeserialize(as = ImmutableCardDto.class)
public interface CardDto {
    String getId();
    int getPower();
    String getName();
    @Value.Default
    default String getImageUrl() {
        return "";
    }
}
