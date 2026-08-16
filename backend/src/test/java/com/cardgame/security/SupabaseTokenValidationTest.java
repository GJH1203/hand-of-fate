package com.cardgame.security;

import com.cardgame.support.TestJwtSupport;
import com.nimbusds.jwt.JWTClaimsSet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * What a Supabase token has to prove before the backend will act on it.
 *
 * <p>These run against the real decoder configuration, so they are the check on the rule
 * that matters most here: a correct signature is not on its own a login.
 */
class SupabaseTokenValidationTest {

    private final JwtDecoder decoder = TestJwtSupport.decoder();

    @Test
    @DisplayName("a signed-in user's token is accepted and its subject becomes the identity")
    void acceptsSignedInUser() {
        Jwt jwt = decoder.decode(TestJwtSupport.tokenFor("user-abc"));

        assertEquals("user-abc", jwt.getSubject());
        assertTrue(jwt.getAudience().contains("authenticated"));
    }

    @Test
    @DisplayName("the anon key is refused even though it is correctly signed")
    void refusesAnonKey() {
        // Supabase's anon key is a JWT from the same project, published in the browser
        // bundle. Accepting it would make the whole exercise pointless.
        String anonKey = TestJwtSupport.tokenFor(null, "anon", "authenticated",
                Instant.now().plus(10, ChronoUnit.DAYS));

        JwtException thrown = assertThrows(JwtException.class, () -> decoder.decode(anonKey));
        assertTrue(thrown.getMessage().contains("no subject"), thrown.getMessage());
    }

    @Test
    @DisplayName("the service_role key is refused")
    void refusesServiceRoleKey() {
        String serviceKey = TestJwtSupport.tokenFor("service", "service_role", "authenticated",
                Instant.now().plus(10, ChronoUnit.DAYS));

        JwtException thrown = assertThrows(JwtException.class, () -> decoder.decode(serviceKey));
        assertTrue(thrown.getMessage().contains("service_role"), thrown.getMessage());
    }

    @Test
    @DisplayName("an expired session is refused")
    void refusesExpiredToken() {
        String expired = TestJwtSupport.tokenFor("user-abc", "authenticated", "authenticated",
                Instant.now().minus(1, ChronoUnit.HOURS));

        assertThrows(JwtException.class, () -> decoder.decode(expired));
    }

    @Test
    @DisplayName("a token from another Supabase project is refused")
    void refusesForeignIssuer() {
        String foreign = TestJwtSupport.sign(new JWTClaimsSet.Builder()
                .issuer("https://someone-elses-project.supabase.co/auth/v1")
                .audience("authenticated")
                .subject("user-abc")
                .claim("role", "authenticated")
                .expirationTime(Date.from(Instant.now().plus(1, ChronoUnit.HOURS)))
                .build());

        assertThrows(JwtException.class, () -> decoder.decode(foreign));
    }

    @Test
    @DisplayName("a token with the wrong audience is refused")
    void refusesWrongAudience() {
        String wrongAudience = TestJwtSupport.tokenFor("user-abc", "authenticated", "some-other-api",
                Instant.now().plus(1, ChronoUnit.HOURS));

        JwtException thrown = assertThrows(JwtException.class, () -> decoder.decode(wrongAudience));
        assertTrue(thrown.getMessage().contains("audience"), thrown.getMessage());
    }

    @Test
    @DisplayName("a token nobody signed is refused")
    void refusesUnsignedToken() {
        String unsigned = "eyJhbGciOiJub25lIn0."
                + "eyJzdWIiOiJ1c2VyLWFiYyIsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.";

        assertThrows(JwtException.class, () -> decoder.decode(unsigned));
    }

    @Test
    @DisplayName("a token signed with a different key is refused")
    void refusesForeignSignature() {
        // Same claims, someone else's key: valid-looking, still not ours.
        String forged = TestJwtSupport.tokenFor("user-abc");
        String tamperedSignature = forged.substring(0, forged.lastIndexOf('.') + 1)
                + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        assertThrows(JwtException.class, () -> decoder.decode(tamperedSignature));
    }
}
