package com.cardgame.security;

import com.cardgame.model.Player;
import com.cardgame.service.player.PlayerService;
import com.cardgame.support.TestJwtSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.socket.WebSocketHttpHeaders;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The WebSocket used to take the player id out of the {@code JOIN_MATCH} payload, so a
 * client could act as its opponent by sending the other id. These pin down the handshake
 * check that replaced it.
 */
class WebSocketAuthInterceptorTest {

    private static final String SUPABASE_USER = "supabase-user-1";
    private static final String PLAYER_ID = "player-1";

    private PlayerService playerService;
    private WebSocketAuthInterceptor interceptor;
    private MockHttpServletRequest servletRequest;
    private MockHttpServletResponse servletResponse;
    private Map<String, Object> attributes;

    @BeforeEach
    void setUp() {
        playerService = mock(PlayerService.class);
        when(playerService.findPlayerBySupabaseUserId(anyString())).thenReturn(Optional.empty());

        Player player = new Player();
        player.setId(PLAYER_ID);
        player.setSupabaseUserId(SUPABASE_USER);
        when(playerService.findPlayerBySupabaseUserId(SUPABASE_USER)).thenReturn(Optional.of(player));

        interceptor = new WebSocketAuthInterceptor(TestJwtSupport.decoder(), playerService);
        servletRequest = new MockHttpServletRequest("GET", "/ws/game");
        servletResponse = new MockHttpServletResponse();
        attributes = new HashMap<>();
    }

    @Test
    @DisplayName("a browser's bearer subprotocol authenticates the socket")
    void acceptsBearerSubprotocol() {
        servletRequest.addHeader(WebSocketHttpHeaders.SEC_WEBSOCKET_PROTOCOL,
                "bearer, " + TestJwtSupport.tokenFor(SUPABASE_USER));

        assertTrue(handshake());
        assertEquals(PLAYER_ID, attributes.get(WebSocketAuthInterceptor.PLAYER_ID_ATTRIBUTE));
        assertEquals(SUPABASE_USER, attributes.get(WebSocketAuthInterceptor.SUPABASE_USER_ID_ATTRIBUTE));
    }

    @Test
    @DisplayName("a non-browser client's Authorization header works too")
    void acceptsAuthorizationHeader() {
        servletRequest.addHeader(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor(SUPABASE_USER));

        assertTrue(handshake());
        assertEquals(PLAYER_ID, attributes.get(WebSocketAuthInterceptor.PLAYER_ID_ATTRIBUTE));
    }

    @Test
    @DisplayName("a handshake with no token is refused")
    void rejectsMissingToken() {
        assertFalse(handshake());
        assertEquals(HttpStatus.UNAUTHORIZED.value(), servletResponse.getStatus());
        assertTrue(attributes.isEmpty());
    }

    @Test
    @DisplayName("a handshake with an expired token is refused")
    void rejectsExpiredToken() {
        servletRequest.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + TestJwtSupport.tokenFor(
                SUPABASE_USER, "authenticated", "authenticated",
                java.time.Instant.now().minusSeconds(3600)));

        assertFalse(handshake());
        assertEquals(HttpStatus.UNAUTHORIZED.value(), servletResponse.getStatus());
    }

    @Test
    @DisplayName("a valid token for somebody with no player yet is refused")
    void rejectsUnknownPlayer() {
        servletRequest.addHeader(HttpHeaders.AUTHORIZATION, TestJwtSupport.bearerFor("stranger"));

        assertFalse(handshake());
        assertEquals(HttpStatus.UNAUTHORIZED.value(), servletResponse.getStatus());
    }

    @Test
    @DisplayName("a token in the query string is not a credential")
    void ignoresQueryParameter() {
        // Query strings end up in access logs and proxy traces, so the interceptor
        // deliberately does not look there.
        servletRequest.setQueryString("token=" + TestJwtSupport.tokenFor(SUPABASE_USER));

        assertFalse(handshake());
    }

    @Test
    @DisplayName("a subprotocol list that is not a bearer pair is ignored")
    void ignoresOtherSubprotocols() {
        servletRequest.addHeader(WebSocketHttpHeaders.SEC_WEBSOCKET_PROTOCOL, "graphql-ws");

        assertFalse(handshake());
    }

    private boolean handshake() {
        ServerHttpRequest request = new ServletServerHttpRequest(servletRequest);
        ServerHttpResponse response = new ServletServerHttpResponse(servletResponse);
        return interceptor.beforeHandshake(request, response, null, attributes);
    }
}
