package com.cardgame.dto.nakama;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableLeaderboardRecordDto.class)
@JsonDeserialize(as = ImmutableLeaderboardRecordDto.class)
public interface LeaderboardRecordDto {
    String getPlayerId();

    @Value.Default
    default String getUsername() {
        return "";
    }

    long getScore();
    int getRank();
}
