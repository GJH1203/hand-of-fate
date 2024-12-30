package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

import java.util.Map;

@Value.Immutable
@JsonSerialize(as = ImmutableBoardDto.class)
@JsonDeserialize(as = ImmutableBoardDto.class)
public interface BoardDto {
    int getWidth();
    int getHeight();
    Map<PositionDto, String> getPieces();
}
