package com.cardgame.service;

import com.cardgame.dto.CardDto;
import com.cardgame.dto.ImmutableCardDto;
import com.cardgame.model.Card;
import com.cardgame.repository.CardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toList;

@Service
public class CardService {

    private CardRepository cardRepository;

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
                .build();
    }
}
