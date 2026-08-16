package com.cardgame.websocket.message;

public enum MessageType {
    // Connection
    CONNECTION_SUCCESS,
    CONNECTION_ERROR,
    
    // Match management
    JOIN_MATCH,
    JOIN_SUCCESS,
    LEAVE_MATCH,
    LEAVE_SUCCESS,
    
    // Game events
    GAME_ACTION,
    GAME_STATE_UPDATE,
    GAME_STATE_REQUEST,
    PLAYER_JOINED,
    PLAYER_DISCONNECTED,
    PLAYER_RECONNECTED,
    TURN_UPDATE,
    GAME_END,
    
    // Error
    ERROR
}