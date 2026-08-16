package com.cardgame.dto;

import com.cardgame.model.Card;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

import java.util.List;

@Value.Immutable
@JsonSerialize(as = ImmutableDeckDto.class)
@JsonDeserialize(as = ImmutableDeckDto.class)
public interface DeckDto {
    String getId();

    // Reference to the owner's ID
    String getOwnerId();

    // List of cards in the deck
    List<Card> getCards();

    // Current number of cards remaining in deck
    int getRemainingCards();

    boolean isValid();

}
