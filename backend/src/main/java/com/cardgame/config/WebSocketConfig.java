package com.cardgame.config;

import com.cardgame.security.BearerSubprotocolHandshakeHandler;
import com.cardgame.security.WebSocketAuthInterceptor;
import com.cardgame.websocket.GameWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GameWebSocketHandler gameWebSocketHandler;
    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    private final AllowedOrigins allowedOrigins;

    public WebSocketConfig(GameWebSocketHandler gameWebSocketHandler,
                           WebSocketAuthInterceptor webSocketAuthInterceptor,
                           AllowedOrigins allowedOrigins) {
        this.gameWebSocketHandler = gameWebSocketHandler;
        this.webSocketAuthInterceptor = webSocketAuthInterceptor;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(gameWebSocketHandler, "/ws/game")
                // Rejects the handshake outright when the token is missing or bad, so a
                // socket never reaches the handler without a known player behind it.
                .addInterceptors(webSocketAuthInterceptor)
                .setHandshakeHandler(new BearerSubprotocolHandshakeHandler())
                .setAllowedOriginPatterns(allowedOrigins.toArray());
    }
}
