package com.cardgame.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration for the authentication layer.
 *
 * <p>Supabase signs session tokens with an asymmetric key and publishes the public
 * half at {@code /auth/v1/.well-known/jwks.json}, so this service can verify a token
 * on its own without holding a shared secret. The JWKS URI is therefore the one
 * setting that has to be right for anything to work.
 */
@ConfigurationProperties(prefix = "security")
public class SecurityProperties {

    private final Jwt jwt = new Jwt();
    private final Admin admin = new Admin();

    public Jwt getJwt() {
        return jwt;
    }

    public Admin getAdmin() {
        return admin;
    }

    public static class Jwt {

        /**
         * Where Supabase publishes its public signing keys. Typically
         * {@code https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json}.
         */
        private String jwkSetUri;

        /**
         * Expected {@code iss} claim, typically
         * {@code https://<project-ref>.supabase.co/auth/v1}. Blank disables the check.
         */
        private String issuer;

        /**
         * Expected {@code aud} claim. Supabase issues {@code authenticated} for a real
         * signed-in user.
         */
        private String audience = "authenticated";

        /**
         * Expected {@code role} claim. Supabase's anon and service keys are themselves
         * JWTs carrying {@code anon} / {@code service_role}, and the anon key ships in
         * the browser bundle — refusing anything but {@code authenticated} is what stops
         * a published key from being usable as a login.
         */
        private String role = "authenticated";

        /**
         * Clock skew allowed when checking {@code exp} and {@code nbf}, in seconds.
         */
        private long clockSkewSeconds = 60;

        public String getJwkSetUri() {
            return jwkSetUri;
        }

        public void setJwkSetUri(String jwkSetUri) {
            this.jwkSetUri = jwkSetUri;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public String getAudience() {
            return audience;
        }

        public void setAudience(String audience) {
            this.audience = audience;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public long getClockSkewSeconds() {
            return clockSkewSeconds;
        }

        public void setClockSkewSeconds(long clockSkewSeconds) {
            this.clockSkewSeconds = clockSkewSeconds;
        }
    }

    public static class Admin {

        /**
         * Supabase user ids granted {@code ROLE_ADMIN}. Empty — the default — means
         * nobody is an admin and the admin endpoints answer 403 to everyone, which is
         * the right posture for an environment where nobody has explicitly been given
         * the keys.
         */
        private List<String> supabaseUserIds = new ArrayList<>();

        public List<String> getSupabaseUserIds() {
            return supabaseUserIds;
        }

        public void setSupabaseUserIds(List<String> supabaseUserIds) {
            this.supabaseUserIds = supabaseUserIds;
        }
    }
}
