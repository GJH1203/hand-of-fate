package com.cardgame.controller;

import com.cardgame.dto.CreateGameRequest;
import com.cardgame.dto.GameDto;
import com.cardgame.service.GameService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/game")
public class GameController {

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
}
