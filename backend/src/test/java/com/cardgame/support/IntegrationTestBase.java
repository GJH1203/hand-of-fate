package com.cardgame.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Shared setup for the tests that boot the whole application.
 *
 * <p>The application refuses to start without a JWKS URI, on the grounds that a backend
 * which cannot verify a token has no business answering requests. The address below is
 * never fetched — tests that need to authenticate replace the decoder with
 * {@link TestJwtSupport}.
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
@TestPropertySource(properties = {
        "security.jwt.jwk-set-uri=http://localhost/jwks-not-fetched-in-tests"
})
public abstract class IntegrationTestBase {
}
