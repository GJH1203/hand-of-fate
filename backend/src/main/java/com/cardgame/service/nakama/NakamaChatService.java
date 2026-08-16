package com.cardgame.service.nakama;

import com.cardgame.dto.nakama.ChatMessageDto;
import com.cardgame.dto.nakama.ImmutableChatMessageDto;
import com.google.gson.Gson;
import com.heroiclabs.nakama.*;
import com.heroiclabs.nakama.api.ChannelMessage;
import com.heroiclabs.nakama.api.ChannelMessageList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

@Service
public class NakamaChatService {
    private static final Logger logger = LoggerFactory.getLogger(NakamaChatService.class);

    private final Client nakamaClient;
    private final NakamaAuthService nakamaAuthService;
    private final Map<String, SocketClient> userSocketClients = new ConcurrentHashMap<>();

    @Autowired
    public NakamaChatService(Client nakamaClient, NakamaAuthService nakamaAuthService) {
        this.nakamaClient = nakamaClient;
        this.nakamaAuthService = nakamaAuthService;
    }

    /**
     * Get or create a socket client for the user
     */
    public SocketClient getSocketClient(String authToken) {
        if (userSocketClients.containsKey(authToken)) {
            return userSocketClients.get(authToken);
        }

        try {
            Session session = nakamaAuthService.getSessionFromToken(authToken);
            if (session == null) {
                logger.error("Failed to get session from token");
                return null;
            }

            // Create the socket client
            SocketClient socketClient = nakamaClient.createSocket();

            // Add socket listener for chat events
            ChatSocketListener chatSocketListener = new ChatSocketListener();

            // Connect to the socket with the session and listener
            socketClient.connect(session, chatSocketListener).get();

            userSocketClients.put(authToken, socketClient);
            logger.info("Socket connected for user");

            return socketClient;
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error creating socket client: {}", e.getMessage(), e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return null;
        }
    }

    /**
     * Join a chat channel
     *
     * @param authToken User's auth token
     * @param channelType Type of channel (ROOM, DIRECT_MESSAGE, GROUP)
     * @param target Target identifier (room name, user ID, or group ID)
     * @param persistence If true, messages are stored in history
     * @param label Optional label for the channel
     * @return Channel ID or null if failed
     */
    public String joinChatChannel(String authToken, String channelType, String target,
                                  boolean persistence, String label) {
        SocketClient socketClient = getSocketClient(authToken);
        if (socketClient == null) {
            logger.error("Failed to get socket client");
            return null;
        }

        try {
            // IMPORTANT: Always use true for persistence if you want messages to appear in console
            // Overriding persistence parameter for debugging
            if (!persistence) {
                logger.warn("Setting persistence to true to ensure messages appear in console");
                persistence = true;
            }

            logger.debug("Joining chat channel with type: '{}', target: '{}', persistence: {}",
                    channelType, target, persistence);

            Channel channel = socketClient.joinChat(
                            target,
                            ChannelType.valueOf(channelType),
                            persistence,  // This must be true to see messages in console
                            false)
                    .get();

            logger.info("Successfully joined chat channel: ID='{}', Target='{}', Persistence='{}'",
                    channel.getId(), target, persistence);

            return channel.getId();
        } catch (Exception e) {
            logger.error("Error joining chat channel: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Leave a chat channel
     */
    public boolean leaveChatChannel(String authToken, String channelId) {
        SocketClient socketClient = getSocketClient(authToken);
        if (socketClient == null) {
            logger.error("Failed to get socket client");
            return false;
        }

        try {
            socketClient.leaveChat(channelId).get();
            logger.info("Left chat channel: {}", channelId);
            return true;
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error leaving chat channel: {}", e.getMessage(), e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return false;
        }
    }

    /**
     * Send a chat message
     */
    public boolean sendChatMessage(String authToken, String channelId, String content) {
        // Validate channel ID
        if (channelId == null || channelId.trim().isEmpty()) {
            logger.error("Cannot send message: Channel ID is empty or null");
            return false;
        }

        SocketClient socketClient = getSocketClient(authToken);
        if (socketClient == null) {
            logger.error("Failed to get socket client");
            return false;
        }

        try {
            // Format the content as a JSON object
            Map<String, String> messageData = new HashMap<>();
            messageData.put("message", content);
            String jsonContent = new Gson().toJson(messageData);

            // Log the channel ID and content for debugging
            logger.debug("Sending message to channel '{}': {}", channelId, jsonContent);

            // Send the message without trying to reconnect
            ChannelMessageAck ack = socketClient.writeChatMessage(channelId, jsonContent).get();
            logger.info("Successfully sent chat message to channel: {}, message ID: {}",
                    channelId, ack.getMessageId());
            return true;
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error sending chat message to channel '{}': {}",
                    channelId, e.getMessage(), e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return false;
        }
    }

    /**
     * Get chat history for a channel
     */
    public List<ChatMessageDto> getChatHistory(String authToken, String channelId, int limit) {
        try {
            Session session = nakamaAuthService.getSessionFromToken(authToken);
            if (session == null) {
                logger.error("Failed to get session from token");
                return List.of();
            }

            // Use the Client API instead of SocketClient
            ChannelMessageList messages = nakamaClient.listChannelMessages(
                    session,
                    channelId,
                    limit,
                    null,  // cursor
                    true   // forward
            ).get();

            // Convert to your DTOs
            List<ChatMessageDto> messageDtos = new ArrayList<>();
            for (int i = 0; i < messages.getMessagesCount(); i++) {
                ChannelMessage message = messages.getMessages(i);
                messageDtos.add(ImmutableChatMessageDto.builder()
                        .messageId(message.getMessageId())
                        .senderId(message.getSenderId())
                        .username(message.getUsername())
                        .content(message.getContent())
                        .timestamp(message.getCreateTime().getSeconds())
                        .build());
            }

            return messageDtos;
        } catch (Exception e) {
            logger.error("Error getting chat history: {}", e.getMessage(), e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return List.of();
        }
    }

    /**
     * Register a message listener for a user
     * Only establish a new connection if one doesn't already exist
     */
    public void registerChannelMessageListener(String authToken, AbstractSocketListener listener) {
        SocketClient socketClient = getSocketClient(authToken);
        if (socketClient == null) {
            logger.error("Failed to get socket client");
            return;
        }

        try {
            // Get the session from token
            Session session = nakamaAuthService.getSessionFromToken(authToken);
            if (session == null) {
                logger.error("Failed to get session from token");
                return;
            }

            // Replace the existing socket client with a new one with the new listener
            userSocketClients.remove(authToken);
            SocketClient newSocketClient = nakamaClient.createSocket();
            newSocketClient.connect(session, listener).get();
            userSocketClients.put(authToken, newSocketClient);

            logger.info("Registered channel message listener for user");
        } catch (Exception e) {
            logger.error("Error registering message listener: {}", e.getMessage(), e);
        }
    }

    /**
     * Close a socket connection
     */
    public void closeSocket(String authToken) {
        SocketClient socketClient = userSocketClients.remove(authToken);
        if (socketClient != null) {
            try {
                socketClient.disconnect();
                logger.info("Socket disconnected for user");
            } catch (Exception e) {
                logger.error("Error disconnecting socket: {}", e.getMessage(), e);
            }
        }
    }
}
