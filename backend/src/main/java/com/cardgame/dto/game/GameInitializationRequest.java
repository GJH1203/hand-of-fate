package com.cardgame.dto.game;

import java.util.List;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableGameInitializationRequest.class)
@JsonDeserialize(as = ImmutableGameInitializationRequest.class)
public interface GameInitializationRequest {
    List<String> getPlayerIds();  // Will contain exactly 2 player IDs
    List<String> getDeckIds();
}
