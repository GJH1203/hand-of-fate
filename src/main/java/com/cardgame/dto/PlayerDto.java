package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

import java.util.List;
import java.util.Map;

@Value.Immutable
@JsonSerialize(as = ImmutablePlayerDto.class)
@JsonDeserialize(as = ImmutablePlayerDto.class)
public interface PlayerDto {

    String getId();
    String getName();
    int getScore();
    int getHandSize();

    DeckDto getCurrentDeck();

    // summary of placed cards
    Map<String, Integer> getPlayerCardCounts();

    @Value.Default
    default List<CardDto> getHand() {
        return List.of();
    }

    @Value.Default
    default Map<PositionDto, CardDto> getPlacedCards() {
        return Map.of();
    }

}
