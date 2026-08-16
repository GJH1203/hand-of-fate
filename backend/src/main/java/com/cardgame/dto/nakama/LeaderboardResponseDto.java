package com.cardgame.dto.nakama;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

import java.util.List;

@Value.Immutable
@JsonSerialize(as = ImmutableLeaderboardResponseDto.class)
@JsonDeserialize(as = ImmutableLeaderboardResponseDto.class)
public interface LeaderboardResponseDto {
    List<LeaderboardRecordDto> getRecords();

    @Value.Default
    default String getNextCursor() {
        return "";
    }

    @Value.Default
    default String getPrevCursor() {
        return "";
    }
}
