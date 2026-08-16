package com.cardgame.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

import javax.annotation.Nullable;
import java.time.LocalDateTime;

@Value.Immutable
@JsonSerialize(as = ImmutableOnboardingPlayerDto.class)
@JsonDeserialize(as = ImmutableOnboardingPlayerDto.class)
public interface OnboardingPlayerDto {

    String getId();
    String getName();
    String getEmail();
    
    @Value.Default
    default boolean getHasCompletedOnboarding() {
        return false;
    }
    
    @Nullable
    LocalDateTime getOnboardingCompletedAt();
    
    @Nullable
    String getTutorialGameId();
}