package com.cardgame.security;

import com.cardgame.config.AllowedOrigins;
import jakarta.servlet.DispatcherType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Turns the API from "anyone who knows a user id is that user" into something that
 * actually checks.
 *
 * <p>Every request must carry a Supabase session token as {@code Authorization: Bearer}.
 * The token is verified against Supabase's published signing keys, and its {@code sub}
 * claim — not anything in the request body — becomes the caller's identity.
 *
 * <p>The default is deny: {@code anyRequest().authenticated()}. New endpoints are closed
 * until somebody deliberately opens them, which is the opposite of how this service
 * behaved before.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(SecurityProperties.class)
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http,
                                                      CorsConfigurationSource corsConfigurationSource,
                                                      JwtAuthenticationConverter jwtAuthenticationConverter)
            throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                // No cookies are involved: the bearer token is the entire credential, so
                // there is nothing for a cross-site request to ride on.
                .csrf(csrf -> csrf.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Async dispatches are how the CompletableFuture endpoints in
                        // OnlineGameController finish, and error dispatches are how a 401
                        // renders. Re-authorizing either one breaks it.
                        .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // The container health check runs before anything has a token.
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()

                        // Metrics describe the running system. Prometheus is not deployed
                        // today; when it comes back it will need an admin credential.
                        .requestMatchers("/actuator/**").hasRole("ADMIN")

                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/auth/cleanup-duplicates").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/players/all").hasRole("ADMIN")

                        // Card templates are game content, not something a player writes.
                        .requestMatchers(HttpMethod.POST, "/cards").hasRole("ADMIN")

                        // Takes a Nakama user id, a score, and someone's credentials as
                        // query parameters, and nothing in the app calls it. Left
                        // reachable for operators rather than deleted blind.
                        .requestMatchers(HttpMethod.POST, "/leaderboards/submit-score").hasRole("ADMIN")

                        // /auth/** is the older Nakama-first login, superseded by
                        // /api/auth/**; /chat/** expects a Nakama token in the
                        // Authorization header, which now carries the Supabase one.
                        // Neither has a caller in the app. Both are shut to ordinary
                        // users until they are reworked or removed.
                        .requestMatchers("/auth/**").hasRole("ADMIN")
                        .requestMatchers("/chat/**").hasRole("ADMIN")

                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));

        return http.build();
    }

    /**
     * Verifies Supabase session tokens against the project's published JWKS.
     *
     * <p>Supabase's asymmetric keys are ES256 by default and RS256 if you pick RSA, so
     * both are accepted. Nothing symmetric is: the legacy anon and service keys are
     * themselves HS256 JWTs signed with a secret, and the anon one ships in the browser
     * bundle. Refusing HS256 outright is what keeps a published key from being usable
     * as a login.
     */
    @Bean
    public JwtDecoder jwtDecoder(SecurityProperties properties) {
        SecurityProperties.Jwt config = properties.getJwt();
        if (config.getJwkSetUri() == null || config.getJwkSetUri().isBlank()) {
            throw new IllegalStateException(
                    "security.jwt.jwk-set-uri is not set. Point it at the Supabase project's "
                            + "/auth/v1/.well-known/jwks.json — without it no token can be verified.");
        }

        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withJwkSetUri(config.getJwkSetUri())
                .jwsAlgorithms(algorithms -> {
                    algorithms.add(SignatureAlgorithm.ES256);
                    algorithms.add(SignatureAlgorithm.RS256);
                })
                .build();

        decoder.setJwtValidator(supabaseTokenValidator(config));
        logger.info("Verifying Supabase tokens against {}", config.getJwkSetUri());
        return decoder;
    }

    /** The claim checks a Supabase token has to pass, independent of how it was signed. */
    public static OAuth2TokenValidator<Jwt> supabaseTokenValidator(SecurityProperties.Jwt config) {
        List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();
        validators.add(new JwtTimestampValidator(Duration.ofSeconds(config.getClockSkewSeconds())));
        validators.add(new SupabaseClaimsValidator(config.getAudience(), config.getRole()));
        if (config.getIssuer() != null && !config.getIssuer().isBlank()) {
            validators.add(new JwtIssuerValidator(config.getIssuer()));
        }
        return new DelegatingOAuth2TokenValidator<>(validators);
    }

    /**
     * Everyone who presents a valid token is a user; the handful of Supabase ids in
     * {@code security.admin.supabase-user-ids} are additionally admins. An empty list
     * means nobody is, and the admin endpoints answer 403 to every caller.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter(SecurityProperties properties) {
        List<String> admins = List.copyOf(properties.getAdmin().getSupabaseUserIds());
        if (admins.isEmpty()) {
            logger.info("No admin Supabase user ids configured — /admin/** is closed to everyone.");
        } else {
            logger.info("{} Supabase user id(s) may reach /admin/**", admins.size());
        }

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            if (admins.contains(jwt.getClaimAsString(JwtClaimNames.SUB))) {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            }
            return authorities;
        });
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AllowedOrigins allowedOrigins) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOrigins.patterns());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
