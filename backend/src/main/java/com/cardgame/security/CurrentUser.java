package com.cardgame.security;

import com.cardgame.model.Player;
import com.cardgame.service.player.PlayerService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * The caller's identity, taken from the verified token rather than from the request.
 *
 * <p>Controllers used to trust whatever player id arrived in the body or the path, which
 * meant knowing an id was the same as being that user. Anything that acts on behalf of a
 * player now goes through here.
 */
@Component
public class CurrentUser {

    private final PlayerService playerService;

    public CurrentUser(PlayerService playerService) {
        this.playerService = playerService;
    }

    /** The Supabase {@code sub} claim of the verified token. */
    public String supabaseUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            throw new AuthenticationCredentialsNotFoundException("No verified Supabase token on this request");
        }
        Jwt token = jwtAuthentication.getToken();
        return token.getSubject();
    }

    /** The email Supabase has on file for the caller, if the token carries one. */
    public Optional<String> email() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            return Optional.empty();
        }
        return Optional.ofNullable(jwtAuthentication.getToken().getClaimAsString("email"))
                .filter(email -> !email.isBlank());
    }

    public boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    /** The caller's Player document, if they have finished registration. */
    public Optional<Player> player() {
        return playerService.findPlayerBySupabaseUserId(supabaseUserId());
    }

    /**
     * The caller's Player document. Callers that have a valid token but no Player yet
     * have to go through {@code /api/auth/sync-verified-user} first.
     */
    public Player requirePlayer() {
        return player().orElseThrow(() -> new AccessDeniedException(
                "No player is registered for this Supabase account yet"));
    }

    public String requirePlayerId() {
        return requirePlayer().getId();
    }

    /**
     * Asserts the caller is the player they claim to be acting as.
     *
     * <p>Admins are allowed through so the cleanup endpoints keep working.
     */
    public void requireSelf(String playerId) {
        if (playerId == null || playerId.isBlank()) {
            throw new AccessDeniedException("No player id supplied");
        }
        if (isAdmin()) {
            return;
        }
        if (!playerId.equals(requirePlayerId())) {
            throw new AccessDeniedException("You may only act as your own player");
        }
    }
}
