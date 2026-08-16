package com.cardgame.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * The single list of browser origins allowed to talk to this service.
 *
 * <p>CORS and the WebSocket handshake both need it and used to carry separate copies
 * that a comment asked you to keep in step by hand. They now read the same list.
 */
@Component
public class AllowedOrigins {

    private static final List<String> BUILT_IN = List.of(
            "http://localhost:3000",
            "http://localhost:3001",
            "https://card-game-frontend-*.vercel.app",
            "https://card-game-frontend.vercel.app",
            // The live domain is .org. The .net entries that used to be here never
            // matched anything, which is why the custom domain could not talk to this
            // API and only the *.vercel.app host worked.
            "https://handoffate.org",
            "https://www.handoffate.org"
            // A bare https://*.vercel.app used to be listed. Combined with
            // allowCredentials(true) that let any Vercel deployment on the internet
            // make credentialed calls to this API.
    );

    private final List<String> patterns;

    public AllowedOrigins(@Value("${cors.allowed-origins:}") String additionalOrigins) {
        List<String> all = new ArrayList<>(BUILT_IN);
        if (additionalOrigins != null && !additionalOrigins.isBlank()) {
            Arrays.stream(additionalOrigins.split(","))
                    .map(String::trim)
                    .filter(origin -> !origin.isEmpty())
                    .forEach(all::add);
        }
        this.patterns = List.copyOf(all);
    }

    public List<String> patterns() {
        return patterns;
    }

    public String[] toArray() {
        return patterns.toArray(new String[0]);
    }
}
