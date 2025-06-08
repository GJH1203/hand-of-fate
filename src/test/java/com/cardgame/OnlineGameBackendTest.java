package com.cardgame;

import com.cardgame.dto.online.CreateMatchRequest;
import com.cardgame.dto.online.JoinMatchRequest;
import com.cardgame.dto.online.MatchResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
public class OnlineGameBackendTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testOnlineGameFlow() throws Exception {
        // Assuming these player IDs exist in your test database
        String player1Id = "68437cb9cd65ec5dbbfa929d";
        String player2Id = "68437caccd65ec5dbbfa929c";

        // Step 1: Create a match
        CreateMatchRequest createRequest = new CreateMatchRequest(player1Id);
        
        MvcResult createResult = mockMvc.perform(post("/api/online-game/create")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andReturn();

        MatchResponse createResponse = objectMapper.readValue(
            createResult.getResponse().getContentAsString(), 
            MatchResponse.class
        );
        
        assertNotNull(createResponse.getMatchId());
        assertEquals("WAITING", createResponse.getStatus());
        System.out.println("Created match: " + createResponse.getMatchId());

        // Step 2: Join the match
        String matchId = createResponse.getMatchId();
        JoinMatchRequest joinRequest = new JoinMatchRequest();
        joinRequest.setPlayerId(player2Id);

        MvcResult joinResult = mockMvc.perform(post("/api/online-game/join/" + matchId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(joinRequest)))
                .andExpect(status().isOk())
                .andReturn();

        MatchResponse joinResponse = objectMapper.readValue(
            joinResult.getResponse().getContentAsString(), 
            MatchResponse.class
        );
        
        assertEquals("IN_PROGRESS", joinResponse.getStatus());
        assertNotNull(joinResponse.getGameId());
        System.out.println("Joined match successfully, game ID: " + joinResponse.getGameId());

        // Step 3: Get match state
        mockMvc.perform(get("/api/online-game/match/" + matchId + "/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.gameState").value("INITIALIZED"));

        System.out.println("Test completed successfully!");
    }
}