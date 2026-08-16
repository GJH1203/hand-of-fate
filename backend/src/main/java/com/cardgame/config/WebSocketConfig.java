package com.cardgame.config;

import com.cardgame.websocket.GameWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    
    @Autowired
    private GameWebSocketHandler gameWebSocketHandler;
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(gameWebSocketHandler, "/ws/game")
                .setAllowedOriginPatterns(
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "https://card-game-frontend-*.vercel.app",
                    "https://card-game-frontend.vercel.app",
                    "https://*.vercel.app",
                    "https://handoffate.net",
                    "https://www.handoffate.net",
                    "https://api.handoffate.net"
                ); // Allow same origins as HTTP CORS
    }
}