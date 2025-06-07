package com.cardgame.websocket;

import com.cardgame.dto.ImmutablePlayerAction;
import com.cardgame.dto.PlayerAction;
import com.cardgame.dto.PlayerAction.ActionType;
import com.cardgame.model.Card;
import com.cardgame.model.Position;
import com.cardgame.service.GameService;
import com.cardgame.service.nakama.NakamaMatchService;
import com.cardgame.websocket.message.WebSocketMessage;
import com.cardgame.websocket.message.MessageType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(GameWebSocketHandler.class);
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private NakamaMatchService nakamaMatchService;
    
    @Autowired
    private GameService gameService;
    
    // Store sessions by match ID
    private final Map<String, Set<WebSocketSession>> matchSessions = new ConcurrentHashMap<>();
    
    // Store session to player/match mapping
    private final Map<String, SessionInfo> sessionInfoMap = new ConcurrentHashMap<>();
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        logger.info("WebSocket connection established: {}", session.getId());
        
        // Send connection success message
        WebSocketMessage message = new WebSocketMessage();
        message.setType(MessageType.CONNECTION_SUCCESS);
        message.setData(Map.of("sessionId", session.getId()));
        
        sendMessage(session, message);
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            String payload = message.getPayload();
            logger.debug("Received message: {}", payload);
            
            WebSocketMessage wsMessage = objectMapper.readValue(payload, WebSocketMessage.class);
            
            switch (wsMessage.getType()) {
                case JOIN_MATCH:
                    handleJoinMatch(session, wsMessage);
                    break;
                    
                case LEAVE_MATCH:
                    handleLeaveMatch(session, wsMessage);
                    break;
                    
                case GAME_ACTION:
                    handleGameAction(session, wsMessage);
                    break;
                    
                case GAME_STATE_REQUEST:
                    handleGameStateRequest(session, wsMessage);
                    break;
                    
                default:
                    logger.warn("Unknown message type: {}", wsMessage.getType());
            }
        } catch (Exception e) {
            logger.error("Error handling message", e);
            sendError(session, "Failed to process message: " + e.getMessage());
        }
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        logger.info("WebSocket connection closed: {} - {}", session.getId(), status);
        
        // Remove session from all data structures
        SessionInfo info = sessionInfoMap.remove(session.getId());
        if (info != null) {
            // Remove from match sessions
            Set<WebSocketSession> sessions = matchSessions.get(info.matchId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    matchSessions.remove(info.matchId);
                }
            }
            
            // Notify Nakama about disconnection - only if match still exists
            try {
                // Check if match is still active before handling disconnection
                if (nakamaMatchService.getMatchMetadata(info.matchId) != null || 
                    nakamaMatchService.doesGameExistForMatch(info.matchId)) {
                    nakamaMatchService.handleDisconnection(info.playerId, info.matchId);
                }
            } catch (Exception e) {
                logger.warn("Could not handle disconnection for match {} - match may no longer exist", info.matchId);
            }
            
            // Notify other players in the match
            broadcastToMatch(info.matchId, new WebSocketMessage(
                MessageType.PLAYER_DISCONNECTED,
                Map.of("playerId", info.playerId)
            ), session.getId());
        }
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        logger.error("WebSocket transport error for session {}", session.getId(), exception);
    }
    
    // Message handlers
    
    private void handleJoinMatch(WebSocketSession session, WebSocketMessage message) {
        Map<String, Object> data = (Map<String, Object>) message.getData();
        String matchId = (String) data.get("matchId");
        String playerId = (String) data.get("playerId");
        
        logger.info("handleJoinMatch - matchId: {}, playerId: {}", matchId, playerId);
        
        if (matchId == null || playerId == null) {
            sendError(session, "Missing matchId or playerId");
            return;
        }
        
        // Store session info
        SessionInfo info = new SessionInfo(matchId, playerId);
        sessionInfoMap.put(session.getId(), info);
        
        // Add session to match
        Set<WebSocketSession> matchSessionSet = matchSessions.computeIfAbsent(matchId, k -> new CopyOnWriteArraySet<>());
        matchSessionSet.add(session);
        
        logger.info("Player {} joined match {} - total players in match: {}", 
            playerId, matchId, matchSessionSet.size());
        
        // Send join success
        WebSocketMessage response = new WebSocketMessage();
        response.setType(MessageType.JOIN_SUCCESS);
        response.setData(Map.of(
            "matchId", matchId,
            "playerId", playerId,
            "playerCount", matchSessionSet.size()
        ));
        
        sendMessage(session, response);
        
        // Notify other players
        logger.info("Broadcasting PLAYER_JOINED to other players in match {}", matchId);
        broadcastToMatch(matchId, new WebSocketMessage(
            MessageType.PLAYER_JOINED,
            Map.of("playerId", playerId)
        ), session.getId());
    }
    
    private void handleLeaveMatch(WebSocketSession session, WebSocketMessage message) {
        SessionInfo info = sessionInfoMap.get(session.getId());
        if (info == null) {
            sendError(session, "Not in a match");
            return;
        }
        
        // Remove from match
        Set<WebSocketSession> sessions = matchSessions.get(info.matchId);
        if (sessions != null) {
            sessions.remove(session);
        }
        
        sessionInfoMap.remove(session.getId());
        
        // Send leave success
        WebSocketMessage response = new WebSocketMessage();
        response.setType(MessageType.LEAVE_SUCCESS);
        sendMessage(session, response);
    }
    
    private void handleGameAction(WebSocketSession session, WebSocketMessage message) {
        SessionInfo info = sessionInfoMap.get(session.getId());
        if (info == null) {
            sendError(session, "Not in a match");
            return;
        }
        
        try {
            Map<String, Object> data = (Map<String, Object>) message.getData();
            String matchId = (String) data.get("matchId");
            Map<String, Object> actionData = (Map<String, Object>) data.get("action");
            
            if (actionData == null) {
                sendError(session, "No action data provided");
                return;
            }
            
            String actionType = (String) actionData.get("type");
            
            // Build PlayerAction
            PlayerAction playerAction = null;
            
            if ("PLACE_CARD".equals(actionType)) {
                // Extract card data
                Map<String, Object> cardData = (Map<String, Object>) actionData.get("card");
                Card card = new Card();
                card.setId((String) cardData.get("id"));
                card.setName((String) cardData.get("name"));
                card.setPower(((Number) cardData.get("power")).intValue());
                
                // Extract position
                Map<String, Object> posData = (Map<String, Object>) actionData.get("targetPosition");
                Position position = new Position(
                    ((Number) posData.get("x")).intValue(),
                    ((Number) posData.get("y")).intValue()
                );
                
                playerAction = ImmutablePlayerAction.builder()
                    .type(ActionType.PLACE_CARD)
                    .playerId(info.playerId)
                    .card(card)
                    .targetPosition(position)
                    .timestamp(System.currentTimeMillis())
                    .build();
                    
            } else if ("PASS".equals(actionType)) {
                playerAction = ImmutablePlayerAction.builder()
                    .type(ActionType.PASS)
                    .playerId(info.playerId)
                    .timestamp(System.currentTimeMillis())
                    .build();
            } else {
                sendError(session, "Unknown action type: " + actionType);
                return;
            }
            
            // Get the game from the match
            NakamaMatchService.MatchMetadata metadata = nakamaMatchService.getMatchMetadata(matchId);
            if (metadata == null || metadata.gameId == null) {
                sendError(session, "Game not found for match");
                return;
            }
            
            // Process the move
            gameService.processMove(metadata.gameId, playerAction);
            
            // Get the updated game model for checking end state
            var updatedGame = gameService.getGameModel(metadata.gameId);
            
            // Broadcast updated game state to all players in the match
            Set<WebSocketSession> sessions = matchSessions.get(info.matchId);
            if (sessions != null) {
                for (WebSocketSession s : sessions) {
                    SessionInfo sInfo = sessionInfoMap.get(s.getId());
                    if (sInfo != null) {
                        // Get game DTO specific to each player
                        var playerGameDto = gameService.convertToDto(updatedGame, sInfo.playerId);
                        sendMessage(s, new WebSocketMessage(
                            MessageType.GAME_STATE_UPDATE,
                            playerGameDto
                        ));
                    }
                }
            }
            
            // Check if game ended
            if (updatedGame.getGameState().name().equals("COMPLETED")) {
                broadcastToMatch(info.matchId, new WebSocketMessage(
                    MessageType.GAME_END,
                    Map.of(
                        "winnerId", updatedGame.getWinnerId(),
                        "scores", updatedGame.getPlayerScores()
                    )
                ), null);
            }
            
        } catch (Exception e) {
            logger.error("Failed to process game action", e);
            sendError(session, "Failed to process action: " + e.getMessage());
        }
    }
    
    private void handleGameStateRequest(WebSocketSession session, WebSocketMessage message) {
        SessionInfo info = sessionInfoMap.get(session.getId());
        if (info == null) {
            sendError(session, "Not in a match");
            return;
        }
        
        try {
            // Check if match is still waiting
            if (nakamaMatchService.isMatchWaiting(info.matchId)) {
                // Send waiting status
                WebSocketMessage response = new WebSocketMessage();
                response.setType(MessageType.GAME_STATE_UPDATE);
                response.setData(Map.of(
                    "status", "WAITING",
                    "matchId", info.matchId,
                    "message", "Waiting for another player to join"
                ));
                sendMessage(session, response);
                return;
            }
            
            // Get current game state
            var gameModel = nakamaMatchService.getMatchState(info.matchId);
            
            // Convert to DTO for the requesting player
            var gameDto = gameService.convertToDto(gameModel, info.playerId);
            
            WebSocketMessage response = new WebSocketMessage();
            response.setType(MessageType.GAME_STATE_UPDATE);
            response.setData(gameDto);
            
            sendMessage(session, response);
        } catch (Exception e) {
            logger.error("Failed to get game state", e);
            sendError(session, "Failed to get game state");
        }
    }
    
    // Utility methods
    
    private void sendMessage(WebSocketSession session, WebSocketMessage message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (IOException e) {
            logger.error("Failed to send message to session {}", session.getId(), e);
        } catch (IllegalStateException e) {
            logger.warn("WebSocket in invalid state for session {}: {}", session.getId(), e.getMessage());
        }
    }
    
    private void sendError(WebSocketSession session, String error) {
        WebSocketMessage message = new WebSocketMessage();
        message.setType(MessageType.ERROR);
        message.setData(Map.of("error", error));
        sendMessage(session, message);
    }
    
    private void broadcastToMatch(String matchId, WebSocketMessage message, String excludeSessionId) {
        Set<WebSocketSession> sessions = matchSessions.get(matchId);
        if (sessions == null) return;
        
        for (WebSocketSession session : sessions) {
            if (excludeSessionId != null && session.getId().equals(excludeSessionId)) {
                continue;
            }
            sendMessage(session, message);
        }
    }
    
    public void broadcastGameUpdate(String matchId, Object gameState) {
        WebSocketMessage message = new WebSocketMessage();
        message.setType(MessageType.GAME_STATE_UPDATE);
        message.setData(gameState);
        
        broadcastToMatch(matchId, message, null);
    }
    
    /**
     * Clear all WebSocket sessions (for admin use)
     */
    public void clearAllSessions() {
        logger.info("Clearing all WebSocket sessions...");
        
        // Close all active sessions
        sessionInfoMap.keySet().forEach(sessionId -> {
            matchSessions.values().forEach(sessions -> {
                sessions.removeIf(session -> session.getId().equals(sessionId));
            });
        });
        
        // Clear maps
        sessionInfoMap.clear();
        matchSessions.clear();
        
        logger.info("All WebSocket sessions cleared");
    }
    
    /**
     * Clear sessions for a specific player
     */
    public void clearPlayerSessions(String playerId) {
        logger.info("Clearing WebSocket sessions for player: {}", playerId);
        
        // Find and close sessions for this player
        sessionInfoMap.entrySet().removeIf(entry -> {
            SessionInfo info = entry.getValue();
            if (info.playerId.equals(playerId)) {
                // Remove from match sessions
                Set<WebSocketSession> sessions = matchSessions.get(info.matchId);
                if (sessions != null) {
                    sessions.removeIf(session -> session.getId().equals(entry.getKey()));
                }
                return true;
            }
            return false;
        });
        
        logger.info("Cleared sessions for player: {}", playerId);
    }
    
    // Inner class to store session info
    private static class SessionInfo {
        final String matchId;
        final String playerId;
        
        SessionInfo(String matchId, String playerId) {
            this.matchId = matchId;
            this.playerId = playerId;
        }
    }
}
