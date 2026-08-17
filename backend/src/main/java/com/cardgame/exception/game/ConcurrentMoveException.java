package com.cardgame.exception.game;

/**
 * A move could not be applied because the game kept changing underneath it.
 *
 * <p>Distinct from {@link InvalidMoveException}: the move was legal, and trying it again
 * against fresh state may well succeed. The client is being told to resync rather than
 * that it did something wrong.
 */
public class ConcurrentMoveException extends RuntimeException {
    public ConcurrentMoveException(String message) {
        super(message);
    }
}
