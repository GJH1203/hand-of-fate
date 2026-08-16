package com.cardgame.security;

import com.cardgame.model.Player;
import com.cardgame.service.player.PlayerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Authenticates the WebSocket handshake, so the socket knows who is on the other end
 * before a single game message is read.
 *
 * <p>The handler used to take the player id straight out of the {@code JOIN_MATCH}
 * payload, which let a client simply say it was its opponent. The id now comes from a
 * verified token and is stashed in the session attributes; see
 * {@link com.cardgame.websocket.GameWebSocketHandler}.
 *
 * <p>Browsers cannot set headers on a WebSocket handshake, so the token travels in the
 * {@code Sec-WebSocket-Protocol} header as {@code bearer, <token>} — the same trick the
 * Kubernetes API uses. Non-browser clients may send an ordinary
 * {@code Authorization: Bearer} header instead. It deliberately does not accept a query
 * parameter: those end up in access logs and proxy traces.
 */
@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    /** Session attribute holding the authenticated player's id. */
    public static final String PLAYER_ID_ATTRIBUTE = "playerId";

    /** Session attribute holding the caller's Supabase user id. */
    public static final String SUPABASE_USER_ID_ATTRIBUTE = "supabaseUserId";

    /** First entry of {@code Sec-WebSocket-Protocol}, marking the second as the token. */
    public static final String BEARER_SUBPROTOCOL = "bearer";

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtDecoder jwtDecoder;
    private final PlayerService playerService;

    public WebSocketAuthInterceptor(JwtDecoder jwtDecoder, PlayerService playerService) {
        this.jwtDecoder = jwtDecoder;
        this.playerService = playerService;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        Optional<String> presented = extractToken(request.getHeaders());
        if (presented.isEmpty()) {
            return reject(response, "handshake carried no token");
        }

        Jwt token;
        try {
            token = jwtDecoder.decode(presented.get());
        } catch (JwtException e) {
            return reject(response, "token rejected: " + e.getMessage());
        }

        Optional<Player> player = playerService.findPlayerBySupabaseUserId(token.getSubject());
        if (player.isEmpty()) {
            return reject(response, "no player registered for Supabase user " + token.getSubject());
        }

        attributes.put(SUPABASE_USER_ID_ATTRIBUTE, token.getSubject());
        attributes.put(PLAYER_ID_ATTRIBUTE, player.get().getId());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // Nothing to clean up: everything this interceptor sets lives on the session.
    }

    /**
     * Pulls the token out of {@code Authorization: Bearer <token>}, or out of a
     * {@code Sec-WebSocket-Protocol: bearer, <token>} pair for browser clients.
     */
    static Optional<String> extractToken(HttpHeaders headers) {
        String authorization = headers.getFirst(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            String token = authorization.substring(BEARER_PREFIX.length()).trim();
            if (!token.isEmpty()) {
                return Optional.of(token);
            }
        }

        List<String> protocols = headers.getOrEmpty(WebSocketHttpHeaders.SEC_WEBSOCKET_PROTOCOL).stream()
                .flatMap(header -> List.of(header.split(",")).stream())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
        if (protocols.size() == 2 && BEARER_SUBPROTOCOL.equalsIgnoreCase(protocols.get(0))) {
            return Optional.of(protocols.get(1));
        }

        return Optional.empty();
    }

    private boolean reject(ServerHttpResponse response, String reason) {
        logger.warn("Refusing WebSocket handshake: {}", reason);
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return false;
    }
}
