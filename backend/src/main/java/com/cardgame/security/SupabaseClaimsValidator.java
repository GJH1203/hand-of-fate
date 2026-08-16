package com.cardgame.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

/**
 * Checks the claims that decide whether a structurally valid Supabase token actually
 * represents a signed-in human.
 *
 * <p>A correct signature is not enough on its own. Supabase's anon and service_role API
 * keys are JWTs from the same project, and the anon one is published in the browser
 * bundle by design — so a token is only accepted when it carries the
 * {@code authenticated} role and a subject to attribute it to.
 */
class SupabaseClaimsValidator implements OAuth2TokenValidator<Jwt> {

    private static final String ROLE_CLAIM = "role";

    private final String expectedAudience;
    private final String expectedRole;

    SupabaseClaimsValidator(String expectedAudience, String expectedRole) {
        this.expectedAudience = expectedAudience;
        this.expectedRole = expectedRole;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        String subject = token.getSubject();
        if (subject == null || subject.isBlank()) {
            return failure("the token carries no subject, so there is no user to act as");
        }

        if (expectedRole != null && !expectedRole.isBlank()) {
            String role = token.getClaimAsString(ROLE_CLAIM);
            if (!expectedRole.equals(role)) {
                return failure("expected role '" + expectedRole + "' but the token carries '" + role + "'");
            }
        }

        if (expectedAudience != null && !expectedAudience.isBlank()) {
            List<String> audience = token.getAudience();
            if (audience == null || !audience.contains(expectedAudience)) {
                return failure("expected audience '" + expectedAudience + "' but the token carries " + audience);
            }
        }

        return OAuth2TokenValidatorResult.success();
    }

    private OAuth2TokenValidatorResult failure(String description) {
        return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", description, null));
    }
}
