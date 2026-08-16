package com.cardgame.service;

import com.cardgame.dto.CardDto;
import com.cardgame.dto.CreateCardRequest;
import com.cardgame.dto.ImmutableCardDto;
import com.cardgame.model.Card;
import com.cardgame.repository.CardRepository;
import org.checkerframework.checker.units.qual.A;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toList;

@Service
public class CardService {

    private final CardRepository cardRepository;

    @Autowired
    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    public CardDto createCard(CreateCardRequest request) {
        Card card = new Card();
        card.setId(generateNextId());
        card.setPower(request.getPower());
        card.setName(request.getName());

        Card savedCard = cardRepository.save(card);
        return convertToDto(savedCard);
    }

    private String generateNextId() {
        try {
            return cardRepository.findAll().stream()
                    .map(Card::getId)
                    .filter(id -> id.matches("\\d+"))  // Only consider numeric IDs
                    .map(Integer::parseInt)
                    .max(Integer::compareTo)
                    .map(maxId -> String.valueOf(maxId + 1))
                    .orElse("1");  // If no numeric cards exist, start with 1
        } catch (NumberFormatException e) {
            // Fallback if any non-numeric IDs cause issues
            return "1";
        }
    }

    public List<CardDto> getAllCards() {
        return cardRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public CardDto getCardById(String id) {
        return cardRepository.findById(id)
                .map(this::convertToDto)
                .orElse(null);
    }

    private CardDto convertToDto(Card card) {
        return ImmutableCardDto.builder()
                .id(card.getId())
                .power(card.getPower())
                .name(card.getName())
                .build();
    }
}
