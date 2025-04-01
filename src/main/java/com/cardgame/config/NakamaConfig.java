package com.cardgame.config;

import com.heroiclabs.nakama.Client;
import com.heroiclabs.nakama.DefaultClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NakamaConfig {

    @Value("${nakama.server.key:defaultkey}")
    private String serverKey;

    @Value("${nakama.host:localhost}")
    private String host;

    @Value("${nakama.port:7349}")
    private int port;

    @Value("${nakama.ssl:false}")
    private boolean ssl;

    @Bean
    public Client nakamaClient() {
        return new DefaultClient(serverKey, host, port, ssl);
    }
}
