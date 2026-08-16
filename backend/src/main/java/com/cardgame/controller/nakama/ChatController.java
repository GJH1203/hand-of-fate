package com.cardgame.controller.nakama;

import com.cardgame.dto.nakama.ChatChannelDto;
import com.cardgame.dto.nakama.ChatMessageDto;
import com.cardgame.dto.nakama.ImmutableChatChannelDto;
import com.cardgame.service.nakama.NakamaChatService;
import com.heroiclabs.nakama.ChannelType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/chat")
public class ChatController {
    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    private final NakamaChatService chatService;

    @Autowired
    public ChatController(NakamaChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * Join a chat channel
     * 
     * @param channelType Type of channel (ROOM, DIRECT_MESSAGE, GROUP)
     * @param target Target identifier (room name, user ID, or group ID)
     * @param persistence Whether messages should be stored in history
     * @param label Optional label for the channel
     * @return Channel info
     */
    @PostMapping("/join")
    public ResponseEntity<ChatChannelDto> joinChannel(
            @RequestHeader("Authorization") String authToken,
            @RequestParam String channelType,
            @RequestParam String target,
            @RequestParam(required = false, defaultValue = "true") boolean persistence,
            @RequestParam(required = false, defaultValue = "") String label) {
        
        try {
            // Validate channel type
            ChannelType.valueOf(channelType);
            
            String channelId = chatService.joinChatChannel(authToken, channelType, target, persistence, label);
            
            if (channelId == null) {
                return ResponseEntity.badRequest().body(
                        ImmutableChatChannelDto.builder()
                                .channelId("")
                                .type(channelType)
                                .target(target)
                                .label(label)
                                .isSuccess(false)
                                .message("Failed to join channel")
                                .build()
                );
            }
            
            return ResponseEntity.ok(
                    ImmutableChatChannelDto.builder()
                            .channelId(channelId)
                            .type(channelType)
                            .target(target)
                            .label(label)
                            .build()
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    ImmutableChatChannelDto.builder()
                            .channelId("")
                            .type(channelType)
                            .target(target)
                            .label(label)
                            .isSuccess(false)
                            .message("Invalid channel type. Use ROOM, DIRECT_MESSAGE, or GROUP")
                            .build()
            );
        } catch (Exception e) {
            logger.error("Error joining channel", e);
            return ResponseEntity.internalServerError().body(
                    ImmutableChatChannelDto.builder()
                            .channelId("")
                            .type(channelType)
                            .target(target)
                            .label(label)
                            .isSuccess(false)
                            .message("Internal server error")
                            .build()
            );
        }
    }

    /**
     * Leave a chat channel
     * 
     * @param channelId ID of the channel to leave
     * @return Success status
     */
    @PostMapping("/leave")
    public ResponseEntity<Map<String, Object>> leaveChannel(
            @RequestHeader("Authorization") String authToken,
            @RequestParam String channelId) {
        
        boolean success = chatService.leaveChatChannel(authToken, channelId);
        
        if (success) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "channelId", channelId
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to leave channel",
                    "channelId", channelId
            ));
        }
    }

    /**
     * Send a message to a channel
     * 
     * @param channelId ID of the channel to send to
     * @param content Message content
     * @return Success status
     */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @RequestHeader("Authorization") String authToken,
            @RequestParam String channelId,
            @RequestParam String content) {
        
        boolean success = chatService.sendChatMessage(authToken, channelId, content);
        
        if (success) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "channelId", channelId
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to send message",
                    "channelId", channelId
            ));
        }
    }

    /**
     * Get chat history for a channel
     * 
     * @param channelId ID of the channel
     * @param limit Maximum number of messages to return
     * @return List of chat messages
     */
    @GetMapping("/history")
    public ResponseEntity<ChatChannelDto> getHistory(
            @RequestHeader("Authorization") String authToken,
            @RequestParam String channelId,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        
        List<ChatMessageDto> messages = chatService.getChatHistory(authToken, channelId, limit);
        
        return ResponseEntity.ok(
                ImmutableChatChannelDto.builder()
                        .channelId(channelId)
                        .type("HISTORY")
                        .target("")
                        .label("")
                        .messages(messages)
                        .build()
        );
    }
    
    /**
     * Close socket connection
     */
    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, Object>> disconnect(
            @RequestHeader("Authorization") String authToken) {
        
        chatService.closeSocket(authToken);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Socket disconnected"
        ));
    }
}
