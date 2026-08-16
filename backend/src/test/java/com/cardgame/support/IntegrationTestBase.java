package com.cardgame.support;

import org.springframework.boot.test.context.SpringBootTest;

/**
 * Shared setup for the tests that boot the whole application.
 *
 * <p>Subclasses are expected to add a database of their own:
 *
 * <pre>{@code
 * @TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_<name>")
 * }</pre>
 *
 * These tests all wipe collections in {@code @BeforeEach} and used to share one database,
 * so whichever class ran first won and the rest failed on data the others had deleted.
 * {@code spring.data.mongodb.database} overrides the database named in {@code MONGODB_URI}
 * while keeping its host and credentials.
 */
@SpringBootTest
public abstract class IntegrationTestBase {
}
