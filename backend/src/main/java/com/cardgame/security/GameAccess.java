package com.cardgame.security;

import com.cardgame.model.GameMode;
import com.cardgame.model.GameModel;
import com.cardgame.service.GameService;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Decides who may look at, and act in, a given game.
 *
 * <p>The rule is not simply "you may only move as yourself", because local mode is a
 * hot-seat: one signed-in player enters an opponent's username and both take turns in the
 * same browser, legitimately submitting moves under either id. So:
 *
 * <ul>
 *   <li>every game endpoint requires the caller to be one of the game's two players;</li>
 *   <li>in an <em>online</em> game the acting id must additionally be the caller's own,
 *       since the two players are on different machines and there is no honest reason to
 *       move for the other one.</li>
 * </ul>
 */
@Component
public class GameAccess {

    private final GameService gameService;
    private final CurrentUser currentUser;

    public GameAccess(@Lazy GameService gameService, CurrentUser currentUser) {
        this.gameService = gameService;
        this.currentUser = currentUser;
    }

    /** The game, if the caller is one of its players. */
    public GameModel requireParticipant(String gameId) {
        GameModel game = gameService.getGameModel(gameId);
        if (currentUser.isAdmin()) {
            return game;
        }
        String callerId = currentUser.requirePlayerId();
        if (game.getPlayerIds() == null || !game.getPlayerIds().contains(callerId)) {
            throw new AccessDeniedException("You are not a player in this game");
        }
        return game;
    }

    /** The game, if the caller may submit this action under {@code actingPlayerId}. */
    public GameModel requireMayActAs(String gameId, String actingPlayerId) {
        GameModel game = requireParticipant(gameId);
        if (actingPlayerId == null || actingPlayerId.isBlank()) {
            throw new AccessDeniedException("No acting player id supplied");
        }
        if (game.getPlayerIds() == null || !game.getPlayerIds().contains(actingPlayerId)) {
            throw new AccessDeniedException("That player is not in this game");
        }
        if (game.getGameMode() == GameMode.ONLINE) {
            currentUser.requireSelf(actingPlayerId);
        }
        return game;
    }
}
