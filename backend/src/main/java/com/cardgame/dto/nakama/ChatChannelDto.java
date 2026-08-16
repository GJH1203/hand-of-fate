package com.cardgame.dto.nakama;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.immutables.value.Value;

import java.util.List;

@Value.Immutable
@JsonSerialize(as = ImmutableChatChannelDto.class)
@JsonDeserialize(as = ImmutableChatChannelDto.class)
public interface ChatChannelDto {
    String getChannelId();
    String getType();
    String getTarget();
    String getLabel();
    
    @Value.Default
    default boolean isSuccess() {
        return true;
    }
    
    @Value.Default
    default String getMessage() {
        return "";
    }
    
    @Value.Auxiliary
    @Value.Default
    default List<ChatMessageDto> getMessages() {
        return List.of();
    }
}