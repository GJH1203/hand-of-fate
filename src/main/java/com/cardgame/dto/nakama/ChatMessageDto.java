package com.cardgame.dto.nakama;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableChatMessageDto.class)
@JsonDeserialize(as = ImmutableChatMessageDto.class)
public interface ChatMessageDto {
    String getMessageId();
    String getSenderId();
    String getUsername();
    String getContent();
    long getTimestamp();
}