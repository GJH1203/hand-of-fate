package com.cardgame.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class MetricsConfig {
    
    private final AtomicInteger activeGames = new AtomicInteger(0);
    private final AtomicInteger activePlayers = new AtomicInteger(0);
    private final AtomicInteger activeWebSocketConnections = new AtomicInteger(0);
    
    @Bean
    public Counter gameCreatedCounter(MeterRegistry meterRegistry) {
        return Counter.builder("game.created.total")
                .description("Total number of games created")
                .register(meterRegistry);
    }
    
    @Bean
    public Counter gameCompletedCounter(MeterRegistry meterRegistry) {
        return Counter.builder("game.completed.total")
                .description("Total number of games completed")
                .register(meterRegistry);
    }
    
    @Bean
    public Counter playerLoginCounter(MeterRegistry meterRegistry) {
        return Counter.builder("player.login.total")
                .description("Total number of player logins")
                .register(meterRegistry);
    }
    
    @Bean
    public Gauge activeGamesGauge(MeterRegistry meterRegistry) {
        return Gauge.builder("game.active", activeGames, AtomicInteger::get)
                .description("Number of currently active games")
                .register(meterRegistry);
    }
    
    @Bean
    public Gauge activePlayersGauge(MeterRegistry meterRegistry) {
        return Gauge.builder("player.active", activePlayers, AtomicInteger::get)
                .description("Number of currently active players")
                .register(meterRegistry);
    }
    
    @Bean
    public Gauge activeWebSocketGauge(MeterRegistry meterRegistry) {
        return Gauge.builder("websocket.connections.active", activeWebSocketConnections, AtomicInteger::get)
                .description("Number of active WebSocket connections")
                .register(meterRegistry);
    }
    
    public void incrementActiveGames() {
        activeGames.incrementAndGet();
    }
    
    public void decrementActiveGames() {
        activeGames.decrementAndGet();
    }
    
    public void incrementActivePlayers() {
        activePlayers.incrementAndGet();
    }
    
    public void decrementActivePlayers() {
        activePlayers.decrementAndGet();
    }
    
    public void incrementWebSocketConnections() {
        activeWebSocketConnections.incrementAndGet();
    }
    
    public void decrementWebSocketConnections() {
        activeWebSocketConnections.decrementAndGet();
    }
}