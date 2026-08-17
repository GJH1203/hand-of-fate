package com.cardgame.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * Playing a card, without a Spring context or a database.
 *
 * <p>The case that matters is the one that shipped broken: a move arriving over the
 * WebSocket is rebuilt from JSON field by field and never carries {@code imageUrl},
 * and {@link Card#equals} compares only id, power and name — so the impostor matched
 * the card in hand, passed validation, and was stored on the board in its place. Every
 * card either player played came back from the database without a picture.
 */
class GameModelPlayCardTest {

    private static final String PLAYER = "player-1";

    private GameModel gameWithHand(Card... hand) {
        GameModel game = new GameModel();
        game.setBoard(new Board());
        game.seatPlayer(PLAYER, "Ransirat", List.of(hand));
        return game;
    }

    @Test
    void keepsTheHandsCopyOfTheCard_notTheOnePassedIn() {
        Card dealt = new Card("lightning-1", 3, "Lightning", "/gifs/lightning.png");
        GameModel game = gameWithHand(dealt);

        // What the WebSocket handler builds out of the action payload: equal to the
        // dealt card as far as equals() is concerned, but with no artwork.
        Card fromTheWire = new Card("lightning-1", 3, "Lightning");
        assertThat(fromTheWire).isEqualTo(dealt);

        game.playCard(PLAYER, new Position(1, 1), fromTheWire);

        Card onBoard = game.placedCardsOf(PLAYER).get("1,1");
        assertThat(onBoard.getImageUrl())
                .as("the card on the board keeps the art it was dealt with")
                .isEqualTo("/gifs/lightning.png");
    }

    @Test
    void removesExactlyOneCopyOfADuplicatedCard() {
        // A deck holds two Sparks. Playing one must not empty the pair.
        Card first = new Card("spark-a", 1, "Spark", "/gifs/spark.png");
        Card second = new Card("spark-b", 1, "Spark", "/gifs/spark.png");
        GameModel game = gameWithHand(first, second);

        game.playCard(PLAYER, new Position(0, 0), new Card("spark-a", 1, "Spark"));

        assertThat(game.handOf(PLAYER)).containsExactly(second);
        assertThat(game.getBoard().getCardIdAt(new Position(0, 0))).isEqualTo("spark-a");
    }

    @Test
    void storesACardTheHandDoesNotHold() {
        // Validation refuses this before it ever gets here; the model still has to be
        // predictable if it is called directly, as the opening deal does.
        GameModel game = gameWithHand();
        Card stray = new Card("thunder-1", 5, "Thunder", "/gifs/thunder.png");

        game.playCard(PLAYER, new Position(2, 4), stray);

        assertThat(game.placedCardsOf(PLAYER).get("2,4")).isEqualTo(stray);
        assertThat(game.handOf(PLAYER)).isEmpty();
    }
}
