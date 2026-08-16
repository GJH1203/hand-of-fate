package com.cardgame.dto;

public class CreatePlayerFromSupabaseRequest {
    private String supabaseUserId;
    private String email;
    private String username;

    public CreatePlayerFromSupabaseRequest() {}

    public CreatePlayerFromSupabaseRequest(String supabaseUserId, String email, String username) {
        this.supabaseUserId = supabaseUserId;
        this.email = email;
        this.username = username;
    }

    public String getSupabaseUserId() {
        return supabaseUserId;
    }

    public void setSupabaseUserId(String supabaseUserId) {
        this.supabaseUserId = supabaseUserId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}