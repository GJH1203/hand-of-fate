package com.cardgame.dto.online;

public class JoinMatchRequest {
    private String playerId;
    
    public JoinMatchRequest() {}
    
    public JoinMatchRequest(String playerId) {
        this.playerId = playerId;
    }
    
    public String getPlayerId() {
        return playerId;
    }
    
    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }
}