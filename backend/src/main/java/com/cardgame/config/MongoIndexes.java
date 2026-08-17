package com.cardgame.config;

import com.cardgame.model.Deck;
import com.cardgame.model.GameModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

/**
 * Creates the indexes the hot queries need.
 *
 * <p>Until this existed the collections carried nothing but {@code _id_}, so every lookup
 * by player or by match read the whole collection. That is what made latency grow with
 * the number of games ever played rather than with the number being played now: a load
 * test that was comfortable on an empty database pushed p99 past two seconds once a few
 * hundred games had accumulated.
 *
 * <p>The indexes are declared here rather than with {@code @Indexed} because
 * {@code spring.data.mongodb.auto-index-creation} defaults to false in Boot 3, and
 * turning it on would also try to build the unique indexes that {@link
 * com.cardgame.model.Player} asks for. Those are a separate problem and a riskier one:
 * they are not sparse, several of the fields are nullable, and a second document with a
 * null would fail the build and take the application down at startup. Note that this
 * means the uniqueness Player declares is not enforced by the database today — which is
 * why a second account can be created on an existing email.
 *
 * <p>Creation is idempotent; MongoDB ignores an index that already exists with the same
 * definition. It is deliberately not fatal: an index that cannot be built is a slow
 * application, not a broken one, and refusing to start would be the worse failure.
 */
@Component
public class MongoIndexes implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(MongoIndexes.class);

    private final MongoTemplate mongoTemplate;

    public MongoIndexes(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        // NakamaMatchService.getMatchState used to read every game in the collection and
        // filter in the JVM. It is reached from isPlayerInMatch, so that ran on every
        // join.
        ensure(GameModel.class, new Index().on("nakamaMatchId", Sort.Direction.ASC).named("game_nakama_match"));

        // Serves both findByPlayerIdsContainingAndGameStateIn and the OrderBy variant of
        // it. playerIds is an array, which makes this multikey — allowed, because it is
        // the only array in the key.
        ensure(GameModel.class, new Index()
                .on("playerIds", Sort.Direction.ASC)
                .on("gameState", Sort.Direction.ASC)
                .on("updatedAt", Sort.Direction.DESC)
                .named("game_player_state_recent"));

        ensure(Deck.class, new Index().on("ownerId", Sort.Direction.ASC).named("deck_owner"));
    }

    private void ensure(Class<?> collection, Index index) {
        try {
            String name = mongoTemplate.indexOps(collection).ensureIndex(index);
            logger.info("Index {} ready on {}", name, mongoTemplate.getCollectionName(collection));
        } catch (RuntimeException e) {
            logger.warn("Could not create an index on {}: {}. Queries will still work, slowly.",
                    mongoTemplate.getCollectionName(collection), e.getMessage());
        }
    }
}
