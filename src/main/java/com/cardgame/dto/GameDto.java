package com.cardgame.dto;


import com.cardgame.model.GameState;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import org.immutables.value.Value;

import java.time.Instant;
import java.util.List;

@Value.Immutable
@JsonSerialize(as = ImmutableGameDto.class)
@JsonDeserialize(as = ImmutableGameDto.class)
public interface GameDto {
    String getId();
    GameState getState();
    BoardDto getBoard();
    String getCurrentPlayerId();
    List<CardDto> getCurrentPlayerHand(); // Add this
    Instant getCreatedAt();
    Instant getUpdatedAt();
}
