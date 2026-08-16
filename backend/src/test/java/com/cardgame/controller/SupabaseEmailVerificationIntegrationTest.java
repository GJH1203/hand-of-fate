package com.cardgame.controller;

import com.cardgame.controller.nakama.AuthController;
import com.cardgame.dto.CreatePlayerFromSupabaseRequest;
import com.cardgame.dto.PlayerResponse;
import com.cardgame.model.Player;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.DeckRepository;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.nakama.NakamaAuthService;
import com.cardgame.service.player.PlayerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heroiclabs.nakama.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;

/**
 * Integration tests for Supabase email verification flow.
 * Tests the complete flow from Supabase signup to backend user creation and Nakama integration.
 */
@SpringBootTest
@ActiveProfiles("test")
class SupabaseEmailVerificationIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private AuthController authController;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private PlayerService playerService;

    @MockBean
    private NakamaAuthService nakamaAuthService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private String testEmail;
    private String testUsername;
    private String testSupabaseUserId;
    private String testNakamaUserId;
    private Session mockSession;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        objectMapper = new ObjectMapper();
        
        // Clean up test data
        playerRepository.deleteAll();
        cardRepository.deleteAll();
        deckRepository.deleteAll();

        setupDefaultCard();

        testEmail = "test@example.com";
        testUsername = "testuser";
        testSupabaseUserId = "supabase-user-" + UUID.randomUUID().toString();
        testNakamaUserId = "nakama-user-" + UUID.randomUUID().toString();

        // Setup mock Nakama session
        mockSession = mock(Session.class);
        when(mockSession.getUserId()).thenReturn(testNakamaUserId);
        when(mockSession.getUsername()).thenReturn(testUsername);
        when(mockSession.getAuthToken()).thenReturn("mock-auth-token");
        when(mockSession.isExpired(any(Date.class))).thenReturn(false);
    }

    private void setupDefaultCard() {
        com.cardgame.model.Card defaultCard = new com.cardgame.model.Card();
        defaultCard.setId("1");
        defaultCard.setName("Default Card");
        defaultCard.setPower(5);
        cardRepository.save(defaultCard);
    }

    /**
     * Test successful Supabase user creation with valid input.
     * Should create a player with only Supabase ID (no Nakama ID initially).
     */
    @Test
    void testCreatePlayerFromSupabase_Success() throws Exception {
        CreatePlayerFromSupabaseRequest request = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value(testUsername))
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.supabaseUserId").value(testSupabaseUserId));

        // Verify player was created in database
        Optional<Player> savedPlayer = playerRepository.findBySupabaseUserId(testSupabaseUserId);
        assertTrue(savedPlayer.isPresent());
        assertEquals(testUsername, savedPlayer.get().getName());
        assertEquals(testEmail, savedPlayer.get().getEmail());
        assertEquals(testSupabaseUserId, savedPlayer.get().getSupabaseUserId());
        assertNull(savedPlayer.get().getNakamaUserId()); // Should be null initially
    }

    /**
     * Test duplicate Supabase user creation.
     * Should return existing player without creating a duplicate.
     */
    @Test
    void testCreatePlayerFromSupabase_DuplicateSupabaseId_ReturnsExisting() throws Exception {
        // First, create a player
        Player existingPlayer = playerService.createPlayerFromSupabase(testUsername, testEmail, testSupabaseUserId);

        CreatePlayerFromSupabaseRequest request = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(existingPlayer.getId()))
                .andExpect(jsonPath("$.name").value(testUsername))
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.supabaseUserId").value(testSupabaseUserId));

        // Verify only one player exists
        assertEquals(1, playerRepository.count());
    }

    /**
     * Test multiple calls to create-from-supabase with same email/username but different Supabase IDs.
     * This simulates the bug where multiple users get created with same email.
     */
    @Test
    void testCreatePlayerFromSupabase_SameEmailDifferentSupabaseId_ShouldFail() throws Exception {
        // Create first user
        CreatePlayerFromSupabaseRequest request1 = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson1 = objectMapper.writeValueAsString(request1);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson1))
                .andExpect(status().isOk());

        // Try to create second user with same email but different Supabase ID
        String differentSupabaseId = "different-supabase-id";
        CreatePlayerFromSupabaseRequest request2 = new CreatePlayerFromSupabaseRequest(
                differentSupabaseId, testEmail, "differentusername");

        String requestJson2 = objectMapper.writeValueAsString(request2);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson2))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Email already exists")));

        // Verify only one player exists
        assertEquals(1, playerRepository.count());
    }

    /**
     * Test the complete email verification flow where user should be created in all systems.
     * This test simulates what should happen after email verification is complete.
     */
    @Test
    void testCompleteEmailVerificationFlow_WithNakamaCreation() throws Exception {
        // Step 1: User verifies email, creates Supabase user (simulated by frontend)
        // Step 2: Frontend calls create-from-supabase endpoint
        CreatePlayerFromSupabaseRequest supabaseRequest = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(supabaseRequest);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk());

        // Verify Supabase user is created in backend
        Optional<Player> supabasePlayer = playerRepository.findBySupabaseUserId(testSupabaseUserId);
        assertTrue(supabasePlayer.isPresent());
        assertNull(supabasePlayer.get().getNakamaUserId());

        // Step 3: To complete the flow, user should also be created in Nakama
        // This would typically happen automatically or via a separate process
        
        // Mock Nakama authentication for the same user
        when(nakamaAuthService.authenticateEmail(testEmail, "password", true, testUsername))
                .thenReturn(mockSession);

        // Step 4: Register with Nakama (should update existing player, not create new one)
        ResponseEntity<com.cardgame.dto.nakama.AuthDto> nakamaResponse = authController.register(testEmail, "password", testUsername);
        
        // This should fail currently because it will try to create a duplicate
        // After fix, it should update the existing player with Nakama ID
        assertEquals(HttpStatus.BAD_REQUEST, nakamaResponse.getStatusCode());
        assertTrue(nakamaResponse.getBody().getMessage().contains("Email already exists"));
    }

    /**
     * Test invalid input validation for create-from-supabase endpoint.
     */
    @Test
    void testCreatePlayerFromSupabase_InvalidInput() throws Exception {
        // Test missing Supabase user ID
        CreatePlayerFromSupabaseRequest request1 = new CreatePlayerFromSupabaseRequest(
                null, testEmail, testUsername);
        String requestJson1 = objectMapper.writeValueAsString(request1);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson1))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Supabase user ID is required")));

        // Test missing email
        CreatePlayerFromSupabaseRequest request2 = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, null, testUsername);
        String requestJson2 = objectMapper.writeValueAsString(request2);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson2))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Email is required")));

        // Test missing username
        CreatePlayerFromSupabaseRequest request3 = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, null);
        String requestJson3 = objectMapper.writeValueAsString(request3);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson3))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Username is required")));
    }

    /**
     * Test the lookup endpoint for finding players by Supabase ID.
     * This simulates the frontend checking if a user already exists.
     */
    @Test
    void testFindPlayerBySupabaseId() throws Exception {
        // Create a player first
        Player player = playerService.createPlayerFromSupabase(testUsername, testEmail, testSupabaseUserId);

        // Test successful lookup
        mockMvc.perform(get("/players/by-supabase-id/" + testSupabaseUserId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(player.getId()))
                .andExpect(jsonPath("$.name").value(testUsername))
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.supabaseUserId").value(testSupabaseUserId));

        // Test lookup with non-existent ID
        mockMvc.perform(get("/players/by-supabase-id/non-existent-id"))
                .andExpect(status().isNotFound());
    }

    /**
     * Test concurrent creation attempts to simulate race conditions.
     * This tests if multiple simultaneous requests can create duplicate users.
     */
    @Test
    void testConcurrentSupabaseUserCreation() throws Exception {
        CreatePlayerFromSupabaseRequest request = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(request);

        // Simulate concurrent requests (this is a simple version, real concurrency testing would be more complex)
        for (int i = 0; i < 3; i++) {
            try {
                mockMvc.perform(post("/auth/create-from-supabase")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestJson));
            } catch (Exception e) {
                // Some requests might fail, which is expected
            }
        }

        // Verify only one player was created
        List<Player> players = playerRepository.findAll();
        assertEquals(1, players.size());
        assertEquals(testSupabaseUserId, players.get(0).getSupabaseUserId());
    }

    /**
     * Test data consistency across all three systems (Supabase, Backend, Nakama).
     * This is the ideal flow that should work after fixes.
     */
    @Test
    void testFullSystemIntegration_SupabaseBackendNakama() {
        // This test represents the desired behavior after fixes
        
        // 1. Create Supabase user (simulated)
        Player supabasePlayer = playerService.createPlayerFromSupabase(testUsername, testEmail, testSupabaseUserId);
        assertNotNull(supabasePlayer);
        assertNull(supabasePlayer.getNakamaUserId());

        // 2. Mock successful Nakama account creation
        when(nakamaAuthService.authenticateEmail(testEmail, "password", true, testUsername))
                .thenReturn(mockSession);

        // 3. After the fix, this should update the existing player instead of failing
        // For now, this test documents the current broken behavior
        ResponseEntity<com.cardgame.dto.nakama.AuthDto> response = authController.register(testEmail, "password", testUsername);
        
        // Current behavior: fails due to duplicate email
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        
        // After fix, this should be OK and the player should have both IDs:
        // assertEquals(HttpStatus.OK, response.getStatusCode());
        // 
        // Player updatedPlayer = playerRepository.findById(supabasePlayer.getId()).orElseThrow();
        // assertEquals(testSupabaseUserId, updatedPlayer.getSupabaseUserId());
        // assertEquals(testNakamaUserId, updatedPlayer.getNakamaUserId());
    }
    
    /**
     * Test the new Nakama integration endpoint for existing Supabase users.
     */
    @Test
    void testIntegrateSupabaseWithNakama_Success() throws Exception {
        // Create a Supabase user first
        Player supabasePlayer = playerService.createPlayerFromSupabase(testUsername, testEmail, testSupabaseUserId);
        assertNull(supabasePlayer.getNakamaUserId());
        
        // Mock Nakama authentication
        when(nakamaAuthService.authenticateEmail(eq(testEmail), anyString(), eq(true), eq(testUsername)))
                .thenReturn(mockSession);

        CreatePlayerFromSupabaseRequest request = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/auth/integrate-supabase-with-nakama")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.token").value("mock-auth-token"))
                .andExpect(jsonPath("$.userId").value(testNakamaUserId))
                .andExpect(jsonPath("$.playerId").value(supabasePlayer.getId()))
                .andExpect(jsonPath("$.message").exists());

        // Verify player now has Nakama ID
        Player updatedPlayer = playerRepository.findById(supabasePlayer.getId()).orElseThrow();
        assertEquals(testNakamaUserId, updatedPlayer.getNakamaUserId());
        assertEquals(testSupabaseUserId, updatedPlayer.getSupabaseUserId());
    }
    
    /**
     * Test Nakama integration for non-existent Supabase user.
     */
    @Test
    void testIntegrateSupabaseWithNakama_UserNotFound() throws Exception {
        CreatePlayerFromSupabaseRequest request = new CreatePlayerFromSupabaseRequest(
                "non-existent-id", testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/auth/integrate-supabase-with-nakama")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Supabase player not found")));
    }
    
    /**
     * Test Nakama integration for user that already has Nakama ID.
     */
    @Test
    void testIntegrateSupabaseWithNakama_AlreadyIntegrated() throws Exception {
        // Create a user and manually set Nakama ID
        Player supabasePlayer = playerService.createPlayerFromSupabase(testUsername, testEmail, testSupabaseUserId);
        supabasePlayer.setNakamaUserId(testNakamaUserId);
        playerService.savePlayer(supabasePlayer);

        CreatePlayerFromSupabaseRequest request = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/auth/integrate-supabase-with-nakama")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value(containsString("already integrated")))
                .andExpect(jsonPath("$.playerId").value(supabasePlayer.getId()))
                .andExpect(jsonPath("$.userId").value(testNakamaUserId));
    }

    /**
     * Test that validates the UserSyncService behavior.
     * This simulates what happens when the frontend calls the sync service.
     */
    @Test
    void testUserSyncServiceSimulation() throws Exception {
        // First call should create user
        CreatePlayerFromSupabaseRequest request = new CreatePlayerFromSupabaseRequest(
                testSupabaseUserId, testEmail, testUsername);

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk());

        // Second call should return existing user (simulating UserSyncService behavior)
        mockMvc.perform(post("/auth/create-from-supabase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supabaseUserId").value(testSupabaseUserId));

        // Verify no duplicates
        assertEquals(1, playerRepository.count());
    }
}