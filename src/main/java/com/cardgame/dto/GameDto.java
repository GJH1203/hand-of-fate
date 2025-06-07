package com.cardgame.dto;

import com.cardgame.model.GameState;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.mongodb.lang.Nullable;
import org.immutables.value.Value;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Value.Immutable
@JsonSerialize(as = ImmutableGameDto.class)
@JsonDeserialize(as = ImmutableGameDto.class)
public interface GameDto {
    String getId();
    GameState getState();
    BoardDto getBoard();
    String getCurrentPlayerId();
    List<CardDto> getCurrentPlayerHand();
    Instant getCreatedAt();
    Instant getUpdatedAt();

    /**
     * Get the scores for each player. Only populated when game is completed.
     */
    @Value.Default
    default Map<String, Integer> getScores() {
        return Map.of();
    }

    /**
     * Get the ID of the winning player. Only populated when game is completed.
     */
    @Nullable
    String getWinnerId();

    /**
     * Whether the game ended in a tie. Only relevant when game is completed.
     */
    @Value.Default
    default boolean isTie() {
        return false;
    }

    /**
     * Whether there is a pending win request from a player.
     */
    @Value.Default
    default boolean hasPendingWinRequest() {
        return false;
    }

    /**
     * The ID of the player who requested an early win calculation.
     * Only populated when hasPendingWinRequest is true.
     */
    @Nullable
    String getPendingWinRequestPlayerId();
    
    /**
     * List of player IDs in the game (in order)
     */
    List<String> getPlayerIds();
}
