package com.cardgame.controller;

import com.cardgame.dto.PositionDto;
import com.cardgame.model.Position;
import com.cardgame.service.PositionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/position")
public class PositionServiceController {

    private static final Logger LOGGER = LoggerFactory.getLogger(PositionServiceController.class);

    private final PositionService positionService;

    public PositionServiceController(PositionService positionService) {
        this.positionService = positionService;
    }

    @PostMapping("/create")
    public ResponseEntity<PositionDto> createPosition(@RequestParam int x, @RequestParam int y) {
        LOGGER.info("Creating position with x: {}, y: {}", x, y);
        PositionDto positionDto = positionService.createPosition(x, y);
        return ResponseEntity.ok(positionDto);
    }

    @PutMapping("/update")
    public ResponseEntity<PositionDto> updatePosition(@RequestParam int currentX, @RequestParam int currentY, @RequestParam int newX, @RequestParam int newY) {
        LOGGER.info("Updating position from x: {}, y: {} to new x: {}, y: {}", currentX, currentY, newX, newY);
        Position position = new Position(currentX, currentY);
        PositionDto positionDto = positionService.updatePosition(position, newX, newY);
        return ResponseEntity.ok(positionDto);
    }

    @GetMapping("/x")
    public ResponseEntity<Integer> getX(@RequestParam int x, @RequestParam int y) {
        LOGGER.info("Getting x for position with x: {}, y: {}", x, y);
        int xPos = positionService.getX(new Position(x, y));
        return ResponseEntity.ok(xPos);
    }

    @GetMapping("/y")
    public ResponseEntity<Integer> getY(@RequestParam int x, @RequestParam int y) {
        LOGGER.info("Getting y for position with x: {}, y: {}", x, y);
        int yPos = positionService.getY(new Position(x, y));
        return ResponseEntity.ok(yPos);
    }
}