package com.cardgame.dto.nakama;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableAuthDto.class)
@JsonDeserialize(as = ImmutableAuthDto.class)
public interface AuthDto {
    @Value.Default
    default boolean isSuccess() {
        return false;
    }

    @Value.Default
    default String getMessage() {
        return "";
    }

    @Value.Default
    default String getToken() {
        return "";
    }

    @Value.Default
    default String getUserId() {
        return "";
    }

    @Value.Default
    default String getUsername() {
        return "";
    }

    @Value.Default
    default String getPlayerId() {
        return "";
    }
}
