package com.cardgame.controller;

import com.cardgame.dto.CreateGameRequest;
import com.cardgame.dto.GameDto;
import com.cardgame.dto.ImmutableGameDto;
import com.cardgame.dto.game.GameInitializationRequest;
import com.cardgame.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/game")
public class GameController {

    private static final Logger log = LoggerFactory.getLogger(GameController.class.getName());

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping("/create")
    public String testEndpoint() {
        return "GameController is working!";
    }

    @PostMapping(value = "/create")
    public GameDto createGame(@RequestBody CreateGameRequest request) {
        return gameService.createGame(
                request.getGameState()
        );
    }

    @PostMapping("/initialize")
    public ResponseEntity<GameDto> initializeGame(@RequestBody GameInitializationRequest request) {
        try {
            if (request.getPlayerIds().size() != 2 || request.getDeckIds().size() != 2) {
                return ResponseEntity.badRequest().build();
            }

            GameDto gameDto = gameService.initializeGame(
                    request.getPlayerIds().get(0),
                    request.getPlayerIds().get(1),
                    request.getDeckIds().get(0),
                    request.getDeckIds().get(1)
            );
            return ResponseEntity.ok(gameDto);
        } catch (IllegalArgumentException e) {
            log.error("Validation error during game initialization", e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Unexpected error during game initialization", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
