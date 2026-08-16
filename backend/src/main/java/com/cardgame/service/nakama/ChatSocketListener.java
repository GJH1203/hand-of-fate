package com.cardgame.service.nakama;

import com.heroiclabs.nakama.AbstractSocketListener;
import com.heroiclabs.nakama.api.ChannelMessage;
import com.heroiclabs.nakama.ChannelPresenceEvent;
import com.heroiclabs.nakama.Error;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Simple implementation of Nakama's socket listener for chat functionality.
 */
public class ChatSocketListener extends AbstractSocketListener {
    private static final Logger logger = LoggerFactory.getLogger(ChatSocketListener.class);

    @Override
    public void onDisconnect(Throwable throwable) {
        if (throwable != null) {
            logger.error("Socket disconnected with error", throwable);
        } else {
            logger.info("Socket disconnected");
        }
    }

    @Override
    public void onError(Error error) {
        logger.error("Socket error: {}", error.getMessage());
    }

    @Override
    public void onChannelMessage(ChannelMessage message) {
        logger.info("Chat message received from {}: {}", 
                    message.getUsername(), 
                    message.getContent());
    }

    @Override
    public void onChannelPresence(ChannelPresenceEvent presence) {
        int joinCount = (presence.getJoins() != null) ? presence.getJoins().size() : 0;
        int leaveCount = (presence.getLeaves() != null) ? presence.getLeaves().size() : 0;

        logger.info("Presence event: {} joins, {} leaves", joinCount, leaveCount);
    }
}
