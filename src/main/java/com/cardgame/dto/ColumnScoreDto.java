package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.mongodb.lang.Nullable;
import org.immutables.value.Value;

import java.util.Map;

@Value.Immutable
@JsonSerialize(as = ImmutableColumnScoreDto.class)
@JsonDeserialize(as = ImmutableColumnScoreDto.class)
public interface ColumnScoreDto {
    /**
     * Map of player ID to their total power in this column
     */
    Map<String, Integer> getPlayerScores();
    
    /**
     * The ID of the player who won this column, null if tied
     */
    @Nullable
    String getWinnerId();
    
    /**
     * Whether this column ended in a tie
     */
    @Value.Default
    default boolean isTie() {
        return false;
    }
}