package com.cardgame;

import com.cardgame.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = "spring.data.mongodb.database=card_game_test_contextload")
class CardGameModelApplicationTests extends IntegrationTestBase {

	@Test
	void contextLoads() {
	}

}
