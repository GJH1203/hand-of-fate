package com.cardgame.dto;

public class PlayerResponse {
    private String id;
    private String name;
    private String email;
    private String supabaseUserId;

    public PlayerResponse() {}

    public PlayerResponse(String id, String name, String email, String supabaseUserId) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.supabaseUserId = supabaseUserId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSupabaseUserId() {
        return supabaseUserId;
    }

    public void setSupabaseUserId(String supabaseUserId) {
        this.supabaseUserId = supabaseUserId;
    }
}