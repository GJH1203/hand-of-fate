package com.cardgame.service;

import com.cardgame.dto.ImmutablePositionDto;
import com.cardgame.dto.PositionDto;
import com.cardgame.model.Position;
import org.springframework.stereotype.Service;

@Service
public class PositionService {

    public PositionDto createPosition(int x, int y) {
        Position position = new Position(x, y);
        return convertToDto(position);
    }

    public PositionDto updatePosition(Position position, int x, int y) {
        position.setX(x);
        position.setY(y);
        return convertToDto(position);
    }

    public int getX(Position position) {
        return position.getX();
    }

    public int getY(Position position) {
        return position.getY();
    }

    private PositionDto convertToDto(Position position) {
        return ImmutablePositionDto.builder()
                .x(position.getX())
                .y(position.getY())
                .build();
    }
}
