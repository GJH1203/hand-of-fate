//package com.cardgame.controller;
//
//import com.cardgame.controller.nakama.AuthController;
//import com.cardgame.dto.nakama.AuthDto;
//import com.cardgame.model.Player;
//import com.cardgame.repository.CardRepository;
//import com.cardgame.repository.DeckRepository;
//import com.cardgame.repository.PlayerRepository;
//import com.cardgame.service.nakama.NakamaAuthService;
//import com.cardgame.service.player.PlayerService;
//import com.heroiclabs.nakama.Session;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.test.context.SpringBootTest;
//import org.springframework.boot.test.mock.mockito.MockBean;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.test.context.ActiveProfiles;
//
//import java.util.Date;
//import java.util.Optional;
//import java.util.UUID;
//
//import static org.junit.jupiter.api.Assertions.*;
//import static org.mockito.ArgumentMatchers.*;
//import static org.mockito.Mockito.*;
//
///**
// * Integration tests for AuthController covering registration, login, and token validation.
// * These tests identify bugs in the current authentication implementation including
// * duplicate user handling, login logic, and data consistency issues.
// */
//@SpringBootTest
//@ActiveProfiles("test")
//class AuthControllerIntegrationTest {
//
//    @Autowired
//    private AuthController authController;
//
//    @Autowired
//    private PlayerRepository playerRepository;
//
//    @Autowired
//    private CardRepository cardRepository;
//
//    @Autowired
//    private DeckRepository deckRepository;
//
//    @MockBean
//    private NakamaAuthService nakamaAuthService;
//
//    private Session mockSession;
//    private String testEmail;
//    private String testPassword;
//    private String testUsername;
//    private String testNakamaUserId;
//
//    @BeforeEach
//    void setUp() {
//        playerRepository.deleteAll();
//        cardRepository.deleteAll();
//        deckRepository.deleteAll();
//
//        setupDefaultCard();
//
//        testEmail = "test@example.com";
//        testPassword = "password123";
//        testUsername = "testuser";
//        testNakamaUserId = "nakama-user-" + UUID.randomUUID().toString();
//
//        mockSession = mock(Session.class);
//        when(mockSession.getUserId()).thenReturn(testNakamaUserId);
//        when(mockSession.getUsername()).thenReturn(testUsername);
//        when(mockSession.getAuthToken()).thenReturn("mock-auth-token");
//        when(mockSession.isExpired(any(Date.class))).thenReturn(false);
//    }
//
//    /**
//     * Creates the default card with ID "1" required by PlayerService for deck creation.
//     * This card is used as a template for creating default player decks.
//     */
//    private void setupDefaultCard() {
//        com.cardgame.model.Card defaultCard = new com.cardgame.model.Card();
//        defaultCard.setId("1");
//        defaultCard.setName("Default Card");
//        defaultCard.setPower(5);
//        cardRepository.save(defaultCard);
//    }
//
//    /**
//     * Tests successful user registration with new email and username.
//     * Verifies that a new player is created and linked to Nakama account.
//     */
//    @Test
//    void testRegisterNewUser_Success() {
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, true, testUsername))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> response = authController.register(testEmail, testPassword, testUsername);
//
//        assertEquals(HttpStatus.OK, response.getStatusCode());
//        assertTrue(response.getBody().isSuccess());
//        assertEquals("mock-auth-token", response.getBody().getToken());
//        assertEquals(testNakamaUserId, response.getBody().getUserId());
//        assertEquals(testUsername, response.getBody().getUsername());
//        assertNotNull(response.getBody().getPlayerId());
//
//        Optional<Player> savedPlayer = playerRepository.findByNakamaUserId(testNakamaUserId);
//        assertTrue(savedPlayer.isPresent());
//        assertEquals(testUsername, savedPlayer.get().getName());
//        assertEquals(testEmail, savedPlayer.get().getEmail());
//    }
//
//    /**
//     * Tests registration failure when Nakama authentication fails.
//     * This should return an error response without creating a player.
//     */
//    @Test
//    void testRegisterUser_NakamaAuthenticationFails() {
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, true, testUsername))
//                .thenReturn(null);
//
//        ResponseEntity<AuthDto> response = authController.register(testEmail, testPassword, testUsername);
//
//        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
//        assertFalse(response.getBody().isSuccess());
//        assertEquals("Registration failed", response.getBody().getMessage());
//
//        Optional<Player> player = playerRepository.findByEmail(testEmail);
//        assertTrue(player.isEmpty());
//    }
//
//    /**
//     * Tests duplicate email prevention in registration.
//     * Should now fail with BAD_REQUEST due to our duplicate prevention fix.
//     */
//    @Test
//    void testRegisterDuplicateEmail_ShouldFail() {
//        String nakamaUserId1 = "nakama-user-1";
//        String nakamaUserId2 = "nakama-user-2";
//
//        Session mockSession1 = mock(Session.class);
//        when(mockSession1.getUserId()).thenReturn(nakamaUserId1);
//        when(mockSession1.getUsername()).thenReturn("user1");
//        when(mockSession1.getAuthToken()).thenReturn("token1");
//
//        Session mockSession2 = mock(Session.class);
//        when(mockSession2.getUserId()).thenReturn(nakamaUserId2);
//        when(mockSession2.getUsername()).thenReturn("user2");
//        when(mockSession2.getAuthToken()).thenReturn("token2");
//
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, true, "user1"))
//                .thenReturn(mockSession1);
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, true, "user2"))
//                .thenReturn(mockSession2);
//
//        ResponseEntity<AuthDto> firstResponse = authController.register(testEmail, testPassword, "user1");
//        assertEquals(HttpStatus.OK, firstResponse.getStatusCode());
//
//        ResponseEntity<AuthDto> secondResponse = authController.register(testEmail, testPassword, "user2");
//
//        assertEquals(HttpStatus.BAD_REQUEST, secondResponse.getStatusCode());
//        assertFalse(secondResponse.getBody().isSuccess());
//        assertTrue(secondResponse.getBody().getMessage().contains("Email already exists"));
//
//        long playersWithSameEmail = playerRepository.findAll().stream()
//                .filter(p -> testEmail.equals(p.getEmail()))
//                .count();
//        assertEquals(1, playersWithSameEmail);
//    }
//
//    /**
//     * Tests duplicate username prevention in registration.
//     * Should now fail with BAD_REQUEST due to our duplicate prevention fix.
//     */
//    @Test
//    void testRegisterDuplicateUsername_ShouldFail() {
//        String nakamaUserId1 = "nakama-user-1";
//        String nakamaUserId2 = "nakama-user-2";
//
//        Session mockSession1 = mock(Session.class);
//        when(mockSession1.getUserId()).thenReturn(nakamaUserId1);
//        when(mockSession1.getUsername()).thenReturn(testUsername);
//        when(mockSession1.getAuthToken()).thenReturn("token1");
//
//        Session mockSession2 = mock(Session.class);
//        when(mockSession2.getUserId()).thenReturn(nakamaUserId2);
//        when(mockSession2.getUsername()).thenReturn(testUsername);
//        when(mockSession2.getAuthToken()).thenReturn("token2");
//
//        when(nakamaAuthService.authenticateEmail("email1@example.com", testPassword, true, testUsername))
//                .thenReturn(mockSession1);
//        when(nakamaAuthService.authenticateEmail("email2@example.com", testPassword, true, testUsername))
//                .thenReturn(mockSession2);
//
//        ResponseEntity<AuthDto> firstResponse = authController.register("email1@example.com", testPassword, testUsername);
//        assertEquals(HttpStatus.OK, firstResponse.getStatusCode());
//
//        ResponseEntity<AuthDto> secondResponse = authController.register("email2@example.com", testPassword, testUsername);
//        assertEquals(HttpStatus.BAD_REQUEST, secondResponse.getStatusCode());
//        assertFalse(secondResponse.getBody().isSuccess());
//        assertTrue(secondResponse.getBody().getMessage().contains("Username already exists"));
//    }
//
//    /**
//     * Tests registration with existing email should fail.
//     * When a player already exists with the same email, registration should fail.
//     */
//    @Test
//    void testRegisterExistingPlayer_ShouldFail() {
//        Player existingPlayer = new Player();
//        existingPlayer.setName("differentuser");
//        existingPlayer.setEmail(testEmail);
//        existingPlayer.setNakamaUserId("different-nakama-id");
//        playerRepository.save(existingPlayer);
//
//        ResponseEntity<AuthDto> response = authController.register(testEmail, testPassword, testUsername);
//
//        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
//        assertFalse(response.getBody().isSuccess());
//        assertTrue(response.getBody().getMessage().contains("Email already exists"));
//
//        long totalPlayers = playerRepository.count();
//        assertEquals(1, totalPlayers);
//    }
//
//    /**
//     * Tests successful login with valid credentials.
//     * Verifies that login returns correct authentication information.
//     */
//    @Test
//    void testLogin_Success() {
//        Player existingPlayer = new Player();
//        existingPlayer.setName(testUsername);
//        existingPlayer.setEmail(testEmail);
//        existingPlayer.setNakamaUserId(testNakamaUserId);
//        playerRepository.save(existingPlayer);
//
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, false, testEmail))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> response = authController.login(testEmail, testPassword);
//
//        assertEquals(HttpStatus.OK, response.getStatusCode());
//        assertTrue(response.getBody().isSuccess());
//        assertEquals("mock-auth-token", response.getBody().getToken());
//        assertEquals(testNakamaUserId, response.getBody().getUserId());
//        assertEquals(testUsername, response.getBody().getUsername());
//        assertEquals(existingPlayer.getId(), response.getBody().getPlayerId());
//    }
//
//    /**
//     * Tests login failure with invalid credentials.
//     * Should return unauthorized status when Nakama authentication fails.
//     */
//    @Test
//    void testLogin_InvalidCredentials() {
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, false, testEmail))
//                .thenReturn(null);
//
//        ResponseEntity<AuthDto> response = authController.login(testEmail, testPassword);
//
//        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
//        assertFalse(response.getBody().isSuccess());
//        assertEquals("Invalid email or password", response.getBody().getMessage());
//    }
//
//    /**
//     * Tests login bug where user can authenticate with Nakama but player account doesn't exist.
//     * This can happen if the player was deleted from the database but still exists in Nakama.
//     */
//    @Test
//    void testLogin_NakamaSuccessButNoPlayerAccount() {
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, false, testEmail))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> response = authController.login(testEmail, testPassword);
//
//        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
//        assertFalse(response.getBody().isSuccess());
//        assertEquals("Player account not found", response.getBody().getMessage());
//    }
//
//    /**
//     * Tests login parameter confusion bug.
//     * The login method passes email as username to Nakama, which may cause issues.
//     */
//    @Test
//    void testLogin_EmailAsUsernameParameter() {
//        Player existingPlayer = new Player();
//        existingPlayer.setName(testUsername);
//        existingPlayer.setEmail(testEmail);
//        existingPlayer.setNakamaUserId(testNakamaUserId);
//        playerRepository.save(existingPlayer);
//
//        authController.login(testEmail, testPassword);
//
//        verify(nakamaAuthService).authenticateEmail(testEmail, testPassword, false, testEmail);
//    }
//
//    /**
//     * Tests successful token validation for valid, non-expired tokens.
//     * Should return user information when token is valid.
//     */
//    @Test
//    void testValidateToken_Success() {
//        Player existingPlayer = new Player();
//        existingPlayer.setName(testUsername);
//        existingPlayer.setEmail(testEmail);
//        existingPlayer.setNakamaUserId(testNakamaUserId);
//        playerRepository.save(existingPlayer);
//
//        when(nakamaAuthService.getSessionFromToken("Bearer mock-auth-token"))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> response = authController.validateToken("Bearer mock-auth-token");
//
//        assertEquals(HttpStatus.OK, response.getStatusCode());
//        assertTrue(response.getBody().isSuccess());
//        assertEquals("mock-auth-token", response.getBody().getToken());
//        assertEquals(existingPlayer.getId(), response.getBody().getPlayerId());
//    }
//
//    /**
//     * Tests token validation failure for invalid tokens.
//     * Should return unauthorized status when token is null or invalid.
//     */
//    @Test
//    void testValidateToken_InvalidToken() {
//        when(nakamaAuthService.getSessionFromToken("Bearer invalid-token"))
//                .thenReturn(null);
//
//        ResponseEntity<AuthDto> response = authController.validateToken("Bearer invalid-token");
//
//        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
//        assertFalse(response.getBody().isSuccess());
//        assertEquals("Invalid or expired token", response.getBody().getMessage());
//    }
//
//    /**
//     * Tests token validation failure for expired tokens.
//     * Should return unauthorized status when token is expired.
//     */
//    @Test
//    void testValidateToken_ExpiredToken() {
//        when(mockSession.isExpired(any(Date.class))).thenReturn(true);
//        when(nakamaAuthService.getSessionFromToken("Bearer expired-token"))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> response = authController.validateToken("Bearer expired-token");
//
//        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
//        assertFalse(response.getBody().isSuccess());
//        assertEquals("Invalid or expired token", response.getBody().getMessage());
//    }
//
//    /**
//     * Tests token validation bug where token is valid but player account doesn't exist.
//     * This can happen if player is deleted while having a valid session.
//     */
//    @Test
//    void testValidateToken_ValidTokenButNoPlayerAccount() {
//        when(nakamaAuthService.getSessionFromToken("Bearer valid-token"))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> response = authController.validateToken("Bearer valid-token");
//
//        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
//        assertFalse(response.getBody().isSuccess());
//        assertEquals("Player account not found", response.getBody().getMessage());
//    }
//
//    /**
//     * Tests registration with empty or invalid input parameters.
//     * Should handle null or empty email, password, and username gracefully.
//     */
//    @Test
//    void testRegister_InvalidInputParameters() {
//        when(nakamaAuthService.authenticateEmail(anyString(), anyString(), anyBoolean(), anyString()))
//                .thenReturn(null);
//
//        ResponseEntity<AuthDto> response1 = authController.register("", testPassword, testUsername);
//        assertEquals(HttpStatus.BAD_REQUEST, response1.getStatusCode());
//
//        ResponseEntity<AuthDto> response2 = authController.register(testEmail, "", testUsername);
//        assertEquals(HttpStatus.BAD_REQUEST, response2.getStatusCode());
//
//        ResponseEntity<AuthDto> response3 = authController.register(testEmail, testPassword, "");
//        assertEquals(HttpStatus.BAD_REQUEST, response3.getStatusCode());
//    }
//
//    /**
//     * Tests login with empty or invalid input parameters.
//     * Should handle null or empty email and password gracefully.
//     */
//    @Test
//    void testLogin_InvalidInputParameters() {
//        when(nakamaAuthService.authenticateEmail(anyString(), anyString(), anyBoolean(), anyString()))
//                .thenReturn(null);
//
//        ResponseEntity<AuthDto> response1 = authController.login("", testPassword);
//        assertEquals(HttpStatus.UNAUTHORIZED, response1.getStatusCode());
//
//        ResponseEntity<AuthDto> response2 = authController.login(testEmail, "");
//        assertEquals(HttpStatus.UNAUTHORIZED, response2.getStatusCode());
//    }
//
//    /**
//     * Tests multiple registration attempts with the same email should fail.
//     * Verifies that duplicate registration is properly prevented.
//     */
//    @Test
//    void testRegister_SameEmailMultipleTimes_ShouldFail() {
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, true, testUsername))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> firstResponse = authController.register(testEmail, testPassword, testUsername);
//        assertEquals(HttpStatus.OK, firstResponse.getStatusCode());
//
//        ResponseEntity<AuthDto> secondResponse = authController.register(testEmail, testPassword, testUsername);
//        assertEquals(HttpStatus.BAD_REQUEST, secondResponse.getStatusCode());
//        assertFalse(secondResponse.getBody().isSuccess());
//        assertTrue(secondResponse.getBody().getMessage().contains("Email already exists"));
//
//        long totalPlayers = playerRepository.count();
//        assertEquals(1, totalPlayers);
//    }
//
//    /**
//     * Tests data consistency between Nakama session and Player model.
//     * Verifies that username and other data remain consistent across the auth flow.
//     */
//    @Test
//    void testDataConsistency_UsernameAndEmail() {
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, true, testUsername))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> registerResponse = authController.register(testEmail, testPassword, testUsername);
//        assertEquals(HttpStatus.OK, registerResponse.getStatusCode());
//
//        Player savedPlayer = playerRepository.findById(registerResponse.getBody().getPlayerId()).orElseThrow();
//        assertEquals(testUsername, savedPlayer.getName());
//        assertEquals(testEmail, savedPlayer.getEmail());
//        assertEquals(testNakamaUserId, savedPlayer.getNakamaUserId());
//
//        when(nakamaAuthService.authenticateEmail(testEmail, testPassword, false, testEmail))
//                .thenReturn(mockSession);
//
//        ResponseEntity<AuthDto> loginResponse = authController.login(testEmail, testPassword);
//        assertEquals(HttpStatus.OK, loginResponse.getStatusCode());
//        assertEquals(registerResponse.getBody().getPlayerId(), loginResponse.getBody().getPlayerId());
//        assertEquals(testUsername, loginResponse.getBody().getUsername());
//    }
//}
