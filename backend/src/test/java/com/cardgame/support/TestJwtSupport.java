package com.cardgame.support;

import com.cardgame.security.SecurityConfig;
import com.cardgame.security.SecurityProperties;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Mints tokens the way Supabase does, so the real filter chain can be exercised without
 * reaching the internet.
 *
 * <p>An ES256 keypair — the same shape Supabase issues — is generated once per JVM: the
 * private half signs test tokens and the public half backs a {@link JwtDecoder} that
 * stands in for the one pointing at Supabase. Everything else is the production
 * configuration unmodified, including the claim validators, so a token this class can
 * mint but production would reject fails here too.
 */
@TestConfiguration
public class TestJwtSupport {

    public static final String ISSUER = "https://test-project.supabase.co/auth/v1";

    private static final ECKey KEY = generateKey();

    private static ECKey generateKey() {
        try {
            return new ECKeyGenerator(Curve.P_256).keyID("test-key").generate();
        } catch (Exception e) {
            throw new IllegalStateException("Could not generate a test signing key", e);
        }
    }

    /** A token that looks like a signed-in Supabase user. */
    public static String tokenFor(String supabaseUserId) {
        return tokenFor(supabaseUserId, "authenticated", "authenticated",
                Instant.now().plus(1, ChronoUnit.HOURS));
    }

    public static String tokenFor(String supabaseUserId, String role, String audience, Instant expiry) {
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .issuer(ISSUER)
                .audience(audience)
                .claim("role", role)
                .issueTime(Date.from(Instant.now().minus(1, ChronoUnit.MINUTES)))
                .expirationTime(Date.from(expiry));
        if (supabaseUserId != null) {
            claims.subject(supabaseUserId).claim("email", supabaseUserId + "@example.test");
        }
        return sign(claims.build());
    }

    public static String sign(JWTClaimsSet claims) {
        try {
            JWSSigner signer = new ECDSASigner(KEY);
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256)
                            .type(JOSEObjectType.JWT)
                            .keyID(KEY.getKeyID())
                            .build(),
                    claims);
            jwt.sign(signer);
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign a test token", e);
        }
    }

    /** Bearer header value for a token belonging to {@code supabaseUserId}. */
    public static String bearerFor(String supabaseUserId) {
        return "Bearer " + tokenFor(supabaseUserId);
    }

    /** A decoder for the locally generated key, keeping the production claim validators. */
    public static JwtDecoder decoder() {
        JWKSource<SecurityContext> keys = new ImmutableJWKSet<>(new JWKSet(KEY.toPublicJWK()));
        DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
        processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.ES256, keys));
        // Spring's validators own claim checking; Nimbus's own verifier would duplicate
        // the expiry check and report it as a different error.
        processor.setJWTClaimsSetVerifier((claims, context) -> { });

        SecurityProperties.Jwt config = new SecurityProperties.Jwt();
        config.setIssuer(ISSUER);

        NimbusJwtDecoder decoder = new NimbusJwtDecoder(processor);
        decoder.setJwtValidator(SecurityConfig.supabaseTokenValidator(config));
        return decoder;
    }

    @Bean
    @Primary
    public JwtDecoder testJwtDecoder() {
        return decoder();
    }
}
