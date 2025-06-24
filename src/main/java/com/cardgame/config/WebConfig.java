package com.cardgame.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Value("${cors.allowed-origins:}")
    private String additionalOrigins;
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = new ArrayList<>(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:3001",
            "https://card-game-frontend-*.vercel.app",
            "https://card-game-frontend.vercel.app",
            "https://*.vercel.app",
            "https://funnygames.duckdns.org"
        ));
        
        // Add any additional origins from environment variable
        if (additionalOrigins != null && !additionalOrigins.isEmpty()) {
            origins.addAll(Arrays.asList(additionalOrigins.split(",")));
        }
        
        registry.addMapping("/**")
                .allowedOrigins(origins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
