package com.cardgame.dto.online;

public class CreateMatchRequest {
    private String playerId;
    
    public CreateMatchRequest() {}
    
    public CreateMatchRequest(String playerId) {
        this.playerId = playerId;
    }
    
    public String getPlayerId() {
        return playerId;
    }
    
    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }
}