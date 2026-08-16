package com.cardgame.security;

import com.cardgame.model.Player;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.support.IntegrationTestBase;
import com.cardgame.support.TestJwtSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end checks on the URL rules, run through the real filter chain.
 *
 * <p>The findings these cover were all live before this change: any request at all was
 * accepted, {@code /admin/**} could wipe the database anonymously, and
 * {@code /api/auth/**} would hand over a session to whoever named the right user id.
 */
@AutoConfigureMockMvc
@Import(TestJwtSupport.class)
@TestPropertySource(properties = {
        "spring.data.mongodb.database=card_game_test_apisecurity",
        "security.admin.supabase-user-ids=admin-supabase-id"
})
class ApiSecurityIntegrationTest extends IntegrationTestBase {

    private static final String ALICE_SUPABASE_ID = "alice-supabase-id";
    private static final String BOB_SUPABASE_ID = "bob-supabase-id";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PlayerRepository playerRepository;

    private String alicePlayerId;
    private String bobPlayerId;

    @BeforeEach
    void setUp() {
        playerRepository.deleteAll();
        alicePlayerId = savePlayer("Alice", ALICE_SUPABASE_ID);
        bobPlayerId = savePlayer("Bob", BOB_SUPABASE_ID);
    }

    private String savePlayer(String name, String supabaseUserId) {
        Player player = new Player();
        player.setName(name);
        player.setEmail(name.toLowerCase() + "@example.test");
        player.setSupabaseUserId(supabaseUserId);
        return playerRepository.save(player).getId();
    }

    @Test
    @DisplayName("an anonymous request is refused")
    void refusesAnonymousRequests() throws Exception {
        mockMvc.perform(get("/players/" + alicePlayerId)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/game/some-game-id")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/leaderboards/weekly")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("the admin surface is not reachable anonymously")
    void refusesAnonymousAdmin() throws Exception {
        mockMvc.perform(get("/admin/data-counts")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/admin/cleanup/all-players").param("confirm", "yes"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/players/all")).andExpect(status().isUnauthorized());

        // Nothing was deleted along the way.
        org.junit.jupiter.api.Assertions.assertEquals(2, playerRepository.count());
    }

    @Test
    @DisplayName("a signed-in player is still not an admin")
    void refusesAdminToOrdinaryUser() throws Exception {
        mockMvc.perform(get("/admin/data-counts").header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/players/all").header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/auth/cleanup-duplicates")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("an allowlisted Supabase id reaches the admin surface")
    void allowsConfiguredAdmin() throws Exception {
        mockMvc.perform(get("/admin/data-counts").header(HttpHeaders.AUTHORIZATION, bearer("admin-supabase-id")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players").value(2));
    }

    @Test
    @DisplayName("a player cannot read somebody else's record")
    void refusesReadingAnotherPlayer() throws Exception {
        mockMvc.perform(get("/players/" + bobPlayerId).header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/players/game/players/" + bobPlayerId + "/hand")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/players/" + alicePlayerId).header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("the auth endpoints go by the token, not by the id in the body")
    void ignoresSuppliedSupabaseId() throws Exception {
        // Alice's token, Bob's id in the body. Before this change that returned Bob's
        // session; now the body is not consulted at all.
        mockMvc.perform(post("/api/auth/sync-verified-user")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"supabaseUserId":"%s","email":"bob@example.test","username":"Bob"}
                                """.formatted(BOB_SUPABASE_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playerId").value(alicePlayerId));
    }

    @Test
    @DisplayName("the health check stays open so the container can start")
    void allowsHealthCheck() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("metrics are not open")
    void refusesAnonymousMetrics() throws Exception {
        mockMvc.perform(get("/actuator/prometheus")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("the superseded Nakama-first login is closed to ordinary users")
    void refusesLegacyAuthPath() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ALICE_SUPABASE_ID))
                        .param("email", "someone@example.test")
                        .param("password", "hunter2")
                        .param("username", "someone"))
                .andExpect(status().isForbidden());
    }

    private String bearer(String supabaseUserId) {
        return TestJwtSupport.bearerFor(supabaseUserId);
    }
}
