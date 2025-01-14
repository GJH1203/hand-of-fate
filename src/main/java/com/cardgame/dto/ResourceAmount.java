package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableResourceAmount.class)
@JsonDeserialize(as = ImmutableResourceAmount.class)
public interface ResourceAmount {
    // the current number of cards in hand
    int getCardsInHand();

}
