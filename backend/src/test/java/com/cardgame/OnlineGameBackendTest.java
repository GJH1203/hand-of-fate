package com.cardgame;

import com.cardgame.dto.online.MatchResponse;
import com.cardgame.model.Player;
import com.cardgame.repository.GameRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.player.PlayerService;
import com.cardgame.support.IntegrationTestBase;
import com.cardgame.support.TestJwtSupport;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
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
 * state, and nobody else can.
 *
 * <p>This used to hardcode two player ids with a comment hoping they existed in whatever
 * database happened to be attached, so it never got past the first request. It now
 * creates the players it needs, and every call carries the token of the player making it
 * — which is also what proves the endpoints take the caller from the token rather than
 * from the request body.
 */
@AutoConfigureMockMvc
@Import(TestJwtSupport.class)
@TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_onlinegame")
public class OnlineGameBackendTest extends IntegrationTestBase {

    private static final String HOST_SUPABASE_ID = "online-host-supabase-id";
    private static final String GUEST_SUPABASE_ID = "online-guest-supabase-id";
    private static final String ONLOOKER_SUPABASE_ID = "online-onlooker-supabase-id";

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

    @BeforeEach
    void setUp() {
        gameRepository.deleteAll();
        playerRepository.deleteAll();
        createPlayer("OnlineHost", HOST_SUPABASE_ID);
        createPlayer("OnlineGuest", GUEST_SUPABASE_ID);
    }

    private void createPlayer(String name, String supabaseUserId) {
        Player player = playerService.createPlayer(
                name, name.toLowerCase() + "@example.test", supabaseUserId, null);
        playerService.createDefaultDeckForPlayer(player.getId());
    }

    @Test
    public void testOnlineGameFlow() throws Exception {
        MatchResponse created = readMatch(createMatchAs(HOST_SUPABASE_ID));
        assertNotNull(created.getMatchId());
        assertEquals("WAITING", created.getStatus());

        MatchResponse joined = readMatch(joinMatchAs(GUEST_SUPABASE_ID, created.getMatchId()));
        assertEquals("IN_PROGRESS", joined.getStatus());
        assertNotNull(joined.getGameId());

        // Both players can read the state.
        mockMvc.perform(get("/api/online-game/match/" + created.getMatchId() + "/state")
                        .header(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor(HOST_SUPABASE_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.gameState").value("IN_PROGRESS"));

        mockMvc.perform(get("/api/online-game/match/" + created.getMatchId() + "/state")
                        .header(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor(GUEST_SUPABASE_ID)))
                .andExpect(status().isOk());
    }

    @Test
    public void testOutsiderCannotReadMatchState() throws Exception {
        createPlayer("Onlooker", ONLOOKER_SUPABASE_ID);

        MatchResponse created = readMatch(createMatchAs(HOST_SUPABASE_ID));
        readMatch(joinMatchAs(GUEST_SUPABASE_ID, created.getMatchId()));

        mockMvc.perform(get("/api/online-game/match/" + created.getMatchId() + "/state")
                        .header(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor(ONLOOKER_SUPABASE_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testAnonymousCallerCannotCreateAMatch() throws Exception {
        mockMvc.perform(post("/api/online-game/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    private MvcResult createMatchAs(String supabaseUserId) throws Exception {
        return performAsync(post("/api/online-game/create")
                .header(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor(supabaseUserId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"));
    }

    private MvcResult joinMatchAs(String supabaseUserId, String matchId) throws Exception {
        return performAsync(post("/api/online-game/join/" + matchId)
                .header(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor(supabaseUserId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"));
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
