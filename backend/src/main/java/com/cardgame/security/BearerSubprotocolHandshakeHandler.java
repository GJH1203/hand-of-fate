package com.cardgame.security;

import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.util.List;

/**
 * Completes the {@code Sec-WebSocket-Protocol} half of the handshake.
 *
 * <p>A browser that offers subprotocols expects the server to pick one; if the response
 * names none, the browser fails the connection. Since {@link WebSocketAuthInterceptor}
 * has the client send its token as {@code bearer, <token>}, this echoes back
 * {@code bearer} — never the token itself, which would put the credential in a response
 * header for no reason.
 */
public class BearerSubprotocolHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected String selectProtocol(List<String> requestedProtocols, WebSocketHandler webSocketHandler) {
        if (requestedProtocols != null && requestedProtocols.stream()
                .anyMatch(WebSocketAuthInterceptor.BEARER_SUBPROTOCOL::equalsIgnoreCase)) {
            return WebSocketAuthInterceptor.BEARER_SUBPROTOCOL;
        }
        return super.selectProtocol(requestedProtocols, webSocketHandler);
    }
}
