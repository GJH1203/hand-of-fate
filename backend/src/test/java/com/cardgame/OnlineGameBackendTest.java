package com.cardgame;

import com.cardgame.dto.online.CreateMatchRequest;
import com.cardgame.dto.online.JoinMatchRequest;
import com.cardgame.dto.online.MatchResponse;
import com.cardgame.model.Player;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.player.PlayerService;
import com.cardgame.support.IntegrationTestBase;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * The online match flow: one player opens a match, another joins it, both can read the
 * state.
 *
 * <p>This used to hardcode two player ids with a comment hoping they existed in whatever
 * database happened to be attached, so it never got past the first request. It now
 * creates the players it needs.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_onlinegame")
public class OnlineGameBackendTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PlayerService playerService;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private GameRepository gameRepository;

    private String hostId;
    private String guestId;

    @BeforeEach
    void setUp() {
        gameRepository.deleteAll();
        playerRepository.deleteAll();
        hostId = createPlayer("OnlineHost");
        guestId = createPlayer("OnlineGuest");
    }

    private String createPlayer(String name) {
        Player player = playerService.createPlayer(
                name, name.toLowerCase() + "@example.test", "supabase-" + name.toLowerCase(), null);
        playerService.createDefaultDeckForPlayer(player.getId());
        return player.getId();
    }

    @Test
    public void testOnlineGameFlow() throws Exception {
        MvcResult createResult = performAsync(post("/api/online-game/create")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateMatchRequest(hostId))));

        MatchResponse created = readMatch(createResult);
        assertNotNull(created.getMatchId());
        assertEquals("WAITING", created.getStatus());

        JoinMatchRequest joinRequest = new JoinMatchRequest();
        joinRequest.setPlayerId(guestId);

        MatchResponse joined = readMatch(performAsync(post("/api/online-game/join/" + created.getMatchId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(joinRequest))));

        assertEquals("IN_PROGRESS", joined.getStatus());
        assertNotNull(joined.getGameId());

        mockMvc.perform(get("/api/online-game/match/" + created.getMatchId() + "/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.gameState").value("IN_PROGRESS"));
    }

    /**
     * These endpoints answer with a {@code CompletableFuture}, so the first exchange
     * usually only starts the request and the body comes back empty without a second
     * dispatch — which is what this test used to trip over once it got that far. A future
     * that has already completed skips the async path entirely, so both are handled.
     */
    private MvcResult performAsync(MockHttpServletRequestBuilder request) throws Exception {
        MvcResult result = mockMvc.perform(request).andReturn();
        if (result.getRequest().isAsyncStarted()) {
            result.getAsyncResult();
            result = mockMvc.perform(asyncDispatch(result)).andReturn();
        }
        status().isOk().match(result);
        return result;
    }

    private MatchResponse readMatch(MvcResult result) throws Exception {
        return objectMapper.readValue(result.getResponse().getContentAsString(), MatchResponse.class);
    }
}
