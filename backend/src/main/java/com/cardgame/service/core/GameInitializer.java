package com.cardgame.service.core;

import com.cardgame.dto.GameDto;

public interface GameInitializer {
    GameDto initializeGame(String Player1Id, String Player2Id, String Deck1Id, String Deck2Id);
}
