package com.cardgame.service.nakama;

import com.heroiclabs.nakama.Client;
import com.heroiclabs.nakama.DefaultSession;
import com.heroiclabs.nakama.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

@Service
public class NakamaAuthService {
    private static final Logger logger = LoggerFactory.getLogger(NakamaAuthService.class);

    private final Client nakamaClient;
    private final Map<String, Session> tokenToSessionMap = new ConcurrentHashMap<>();

    @Autowired
    public NakamaAuthService(Client nakamaClient) {
        this.nakamaClient = nakamaClient;
    }

    /**
     * Authenticate or register a user with email and password
     */
    public Session authenticateEmail(String email, String password, boolean createIfMissing, String username) {
        try {
            Session session = nakamaClient.authenticateEmail(email, password, createIfMissing, username).get();
            tokenToSessionMap.put(session.getAuthToken(), session);
            logger.info("User authenticated with email: {}", email);
            return session;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Email authentication failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Validate and get session from token
     */
    public Session getSessionFromToken(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }

        // Check cache first
        if (tokenToSessionMap.containsKey(token)) {
            Session session = tokenToSessionMap.get(token);
            if (!session.isExpired(new Date(System.currentTimeMillis()))) {
                return session;
            } else {
                tokenToSessionMap.remove(token);
            }
        }

        // Try to restore session
        try {
            Session session = DefaultSession.restore(token, nakamaClient.toString());
            if (!session.isExpired(new Date(System.currentTimeMillis()))) {
                tokenToSessionMap.put(token, session);
                return session;
            }
        } catch (Exception e) {
            logger.error("Error restoring session: {}", e.getMessage());
        }

        return null;
    }
}
